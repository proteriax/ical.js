/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
* Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { formatClassType, binsearchInsert } from './helpers'
import { Time } from './Time'
import { RecurIterator } from './RecurIterator'
import { Component } from './Component'

/**
 * This symbol is further described later on
 */
function formatTime(item: Partial<Time>) {
  return formatClassType(item, Time)
}

function compareTime(a: Time, b: Time) {
  return a.compare(b)
}

function isRecurringComponent(comp) {
  return comp.hasProperty('rdate') ||
          comp.hasProperty('rrule') ||
          comp.hasProperty('recurrence-id')
}

interface RecurExpansionOptions {
  ruleDateInc: number
  exDateInc: number
  last: Partial<Time>
  ruleDates: Partial<Time>[]
  exDates: Partial<Time>[]
  complete: boolean
  /** Start time of the event */
  dtstart: Time
  /** Component for expansion, required if not resuming. */
  component?: Component
  ruleIterators?: Partial<RecurIterator>[]
}

/**
 * Primary class for expanding recurring rules.  Can take multiple rrules,
 * rdates, exdate(s) and iterate (in order) over each next occurrence.
 *
 * Once initialized this class can also be serialized saved and continue
 * iteration from the last point.
 *
 * NOTE: it is intended that this class is to be used
 *       with Event which handles recurrence exceptions.
 */
export class RecurExpansion {
  /**
   * @example
   * // assuming event is a parsed ical component
   * var event;
   *
   * var expand = new RecurExpansion({
   *   component: event,
   *   dtstart: event.getFirstPropertyValue('dtstart')
   * });
   *
   * // remember there are infinite rules
   * // so its a good idea to limit the scope
   * // of the iterations then resume later on.
   *
   * // next is always an Time or null
   * var next;
   *
   * while (someCondition && (next = expand.next())) {
   *   // do something with next
   * }
   *
   * // save instance for later
   * var json = JSON.stringify(expand);
   *
   * //...
   *
   * // NOTE: if the component's properties have
   * //       changed you will need to rebuild the
   * //       class and start over. This only works
   * //       when the component's recurrence info is the same.
   * var expand = new RecurExpansion(JSON.parse(json));
   *
   * @description
   * The options object can be filled with the specified initial values. It can
   * also contain additional members, as a result of serializing a previous
   * expansion state, as shown in the example.
   *
   * @param options Recurrence expansion options
   */
  constructor(options: Partial<RecurExpansionOptions>) {
    this.fromData(options)
  }

  /**
   * True when iteration is fully completed.
   */
  complete: boolean = false

  /**
   * Array of rrule iterators.
   */
  private ruleIterators: RecurIterator[]

  /**
   * Array of rdate instances.
   */
  ruleDates: Time[] = []

  /**
   * Array of exdate instances.
   */
  private exDates: Time[] = []

  /**
   * Current position in ruleDates array.
   */
  private ruleDateInc: number = 0

  /**
   * Current position in exDates array
   */
  private exDateInc: number = 0

  /**
   * Current negative date.
   */
  private exDate: Time

  /**
   * Current additional date.
   */
  private ruleDate: Time

  /**
   * Start date of recurring rules.
   */
  dtstart: Time

  /**
   * Last expanded time
   */
  last: Time

  /**
   * Initialize the recurrence expansion from the data object. The options
   * object may also contain additional members, see the
   * {@link RecurExpansion constructor} for more details.
   *
   * @param options
   *        Recurrence expansion options
   * @param options.dtstart
   *        Start time of the event
   * @param {Component=} options.component
   *        Component for expansion, required if not resuming.
   */
  fromData(options: Partial<RecurExpansionOptions>) {
    const start = formatClassType(options.dtstart!, Time)

    if (!start) {
      throw new Error('.dtstart (Time) must be given')
    } else {
      this.dtstart = start
    }

    if (options.component) {
      this._init(options.component)
    } else {
      this.last = formatTime(options.last!) || start.clone()

      if (!options.ruleIterators) {
        throw new Error('.ruleIterators or .component must be given')
      }

      this.ruleIterators = options.ruleIterators.map(item => formatClassType(item, RecurIterator))

      this.ruleDateInc = options.ruleDateInc!
      this.exDateInc = options.exDateInc!

      if (options.ruleDates) {
        this.ruleDates = options.ruleDates.map(formatTime)
        this.ruleDate = this.ruleDates[this.ruleDateInc]
      }

      if (options.exDates) {
        this.exDates = options.exDates.map(formatTime)
        this.exDate = this.exDates[this.exDateInc]
      }

      if (typeof(options.complete) !== 'undefined') {
        this.complete = options.complete
      }
    }
  }

  /**
   * Retrieve the next occurrence in the series.
   * @return {Time}
   */
  next(): Time {
    let iter
    let next
    let compare

    const maxTries = 500
    let currentTry = 0

    while (true) {
      if (currentTry++ > maxTries) {
        throw new Error(
          'max tries have occured, rule may be impossible to forfill.'
        )
      }

      next = this.ruleDate
      iter = this._nextRecurrenceIter()

      // no more matches
      // because we increment the rule day or rule
      // _after_ we choose a value this should be
      // the only spot where we need to worry about the
      // end of events.
      if (!next && !iter) {
        // there are no more iterators or rdates
        this.complete = true
        break
      }

      // no next rule day or recurrence rule is first.
      if (!next || (iter && next.compare(iter.last) > 0)) {
        // must be cloned, recur will reuse the time element.
        next = iter.last.clone()
        // move to next so we can continue
        iter.next()
      }

      // if the ruleDate is still next increment it.
      if (this.ruleDate === next) {
        this._nextRuleDay()
      }

      this.last = next

      // check the negative rules
      if (this.exDate) {
        compare = this.exDate.compare(this.last)

        if (compare < 0) {
          this._nextExDay()
        }

        // if the current rule is excluded skip it.
        if (compare === 0) {
          this._nextExDay()
          continue
        }
      }

      // XXX: The spec states that after we resolve the final
      //     list of dates we execute exdate this seems somewhat counter
      //     intuitive to what I have seen most servers do so for now
      //     I exclude based on the original date not the one that may
      //     have been modified by the exception.
      return this.last
    }

    // Unreachable code
    return this.last
  }

  /**
   * Converts object into a serialize-able format. This format can be passed
   * back into the expansion to resume iteration.
   * @return {Object}
   */
  toJSON(): object {
    function toJSON(item) {
      return item.toJSON()
    }

    const result = Object.create(null)
    result.ruleIterators = this.ruleIterators.map(toJSON)

    if (this.ruleDates) {
      result.ruleDates = this.ruleDates.map(toJSON)
    }

    if (this.exDates) {
      result.exDates = this.exDates.map(toJSON)
    }

    result.ruleDateInc = this.ruleDateInc
    result.exDateInc = this.exDateInc
    result.last = this.last.toJSON()
    result.dtstart = this.dtstart.toJSON()
    result.complete = this.complete

    return result
  }

  /**
   * Extract all dates from the properties in the given component. The
   * properties will be filtered by the property name.
   *
   * @private
   * @param component        The component to search in
   * @param propertyName             The property name to search for
   * @return {Time[]}                    The extracted dates.
   */
  _extractDates(component: Component, propertyName: string): Time[] {
    function handleProp(prop) {
      idx = binsearchInsert(
        result,
        prop,
        compareTime
      )

      // ordered insert
      result.splice(idx, 0, prop)
    }

    const result: Time[] = []
    const props = component.getAllProperties(propertyName)
    const len = props.length
    let i = 0
    let idx

    for (; i < len; i++) {
      props[i].getValues().forEach(handleProp)
    }

    return result
  }

  /**
   * Initialize the recurrence expansion.
   *
   * @private
   * @param component    The component to initialize from.
   */
  _init(component: Component) {
    this.ruleIterators = []

    this.last = this.dtstart.clone()

    // to provide api consistency non-recurring
    // events can also use the iterator though it will
    // only return a single time.
    if (!isRecurringComponent(component)) {
      this.ruleDate = this.last.clone()
      this.complete = true
      return
    }

    if (component.hasProperty('rdate')) {
      this.ruleDates = this._extractDates(component, 'rdate')

      // special hack for cases where first rdate is prior
      // to the start date. We only check for the first rdate.
      // This is mostly for google's crazy recurring date logic
      // (contacts birthdays).
      if ((this.ruleDates[0]) &&
          (this.ruleDates[0].compare(this.dtstart) < 0)) {

        this.ruleDateInc = 0
        this.last = this.ruleDates[0].clone()
      } else {
        this.ruleDateInc = binsearchInsert(
          this.ruleDates,
          this.last,
          compareTime
        )
      }

      this.ruleDate = this.ruleDates[this.ruleDateInc]
    }

    if (component.hasProperty('rrule')) {
      const rules = component.getAllProperties('rrule')
      let i = 0
      const len = rules.length

      let rule
      let iter

      for (; i < len; i++) {
        rule = rules[i].getFirstValue()
        iter = rule.iterator(this.dtstart)
        this.ruleIterators.push(iter)

        // increment to the next occurrence so future
        // calls to next return times beyond the initial iteration.
        // XXX: I find this suspicious might be a bug?
        iter.next()
      }
    }

    if (component.hasProperty('exdate')) {
      this.exDates = this._extractDates(component, 'exdate')
      // if we have a .last day we increment the index to beyond it.
      this.exDateInc = binsearchInsert(
        this.exDates,
        this.last,
        compareTime
      )

      this.exDate = this.exDates[this.exDateInc]
    }
  }

  /**
   * Advance to the next exdate
   * @private
   */
  _nextExDay() {
    this.exDate = this.exDates[++this.exDateInc]
  }

  /**
   * Advance to the next rule date
   * @private
   */
  _nextRuleDay() {
    this.ruleDate = this.ruleDates[++this.ruleDateInc]
  }

  /**
   * Find and return the recurrence rule with the most recent event and
   * return it.
   *
   * @private
   * @return {?RecurIterator}    Found iterator.
   */
  _nextRecurrenceIter(): RecurIterator | undefined {
    const iters = this.ruleIterators

    if (iters.length === 0) {
      return
    }

    let len = iters.length
    let iter
    let iterTime
    let iterIdx = 0
    let chosenIter

    // loop through each iterator
    for (; iterIdx < len; iterIdx++) {
      iter = iters[iterIdx]
      iterTime = iter.last

      // if iteration is complete
      // then we must exclude it from
      // the search and remove it.
      if (iter.completed) {
        len--
        if (iterIdx !== 0) {
          iterIdx--
        }
        iters.splice(iterIdx, 1)
        continue
      }

      // find the most recent possible choice
      if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
        // that iterator is saved
        chosenIter = iter
      }
    }

    // the chosen iterator is returned but not mutated
    // this iterator contains the most recent event.
    return chosenIter
  }
}
