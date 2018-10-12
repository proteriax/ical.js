/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { Time, WeekDay } from './Time'
import { strictParseInt, clone } from './helpers'
import { RecurIterator } from './RecurIterator'
import { design } from './design'

export interface RecurOptions {
  /** The frequency value */
  freq: FrequencyValues
  /** The INTERVAL value */
  interval: number
  /** The week start value */
  wkst: WeekDay
  /** The end of the recurrence set */
  until: Time
  /** The number of occurrences */
  count: Number
  /** The seconds for the BYSECOND part */
  bysecond: number[]
  /** The minutes for the BYMINUTE part */
  byminute: number[]
  /** The hours for the BYHOUR part */
  byhour: number[]
  /** The BYDAY values */
  byday: string[]
  /** The days for the BYMONTHDAY part */
  bymonthday: number[]
  /** The days for the BYYEARDAY part */
  byyearday: number[]
  /** The weeks for the BYWEEKNO part */
  byweekno: number[]
  /** The month for the BYMONTH part */
  bymonth: number[]
  /** The positionals for the BYSETPOS part */
  bysetpos: number[]
}

const DOW_MAP = {
  SU: Time.SUNDAY,
  MO: Time.MONDAY,
  TU: Time.TUESDAY,
  WE: Time.WEDNESDAY,
  TH: Time.THURSDAY,
  FR: Time.FRIDAY,
  SA: Time.SATURDAY
}

const REVERSE_DOW_MAP = {}
for (const key in DOW_MAP) {
  /* istanbul ignore else */
  if (DOW_MAP.hasOwnProperty(key)) {
    REVERSE_DOW_MAP[DOW_MAP[key]] = key
  }
}


/**
 * This class represents the “recur” value type, with various calculation and
 * manipulation methods.
 */
export class Recur {
  /**
   * @param data An object with members of the recurrence
   */
  constructor(data?: Partial<RecurOptions>) {
    if (data && typeof(data) === 'object') {
      this.fromData(data)
    }
  }

  /**
   * An object holding the BY-parts of the recurrence rule
   */
  parts: any = {}

  /**
   * The interval value for the recurrence rule.
   */
  interval: number = 1

  /**
   * The week start day
   */
  wkst: WeekDay = Time.MONDAY

  /**
   * The end of the recurrence
   */
  until: Time

  /**
   * The maximum number of occurrences
   */
  count: number

  /**
   * The frequency value.
   * @type {Recur.frequencyValues}
   */
  freq: FrequencyValues

  /**
   * The type name, to be used in the jCal object.
   */
  readonly icaltype: string = 'recur'

  /**
   * Create a new iterator for this recurrence rule. The passed start date
   * must be the start date of the event, not the start of the range to
   * search in.
   *
   * @example
   * var recur = comp.getFirstPropertyValue('rrule');
   * var dtstart = comp.getFirstPropertyValue('dtstart');
   * var iter = recur.iterator(dtstart);
   * for (var next = iter.next(); next; next = iter.next()) {
   *   if (next.compare(rangeStart) < 0) {
   *     continue;
   *   }
   *   console.log(next.toString());
   * }
   *
   * @param aStart        The item's start date
   * @return The recurrence iterator
   */
  iterator(aStart: Time): RecurIterator {
    return new RecurIterator({
      rule: this,
      dtstart: aStart
    })
  }

  /**
   * Returns a clone of the recurrence object.
   *
   * @return The cloned object
   */
  clone(): Recur {
    return new Recur(this.toJSON())
  }

  /**
   * Checks if the current rule is finite, i.e. has a count or until part.
   *
   * @return True, if the rule is finite
   */
  isFinite(): boolean {
    return !!(this.count || this.until)
  }

  /**
   * Checks if the current rule has a count part, and not limited by an until
   * part.
   *
   * @return True, if the rule is by count
   */
  isByCount(): boolean {
    return !!(this.count && !this.until)
  }

  /**
   * Adds a component (part) to the recurrence rule. This is not a component
   * in the sense of {@link Component}, but a part of the recurrence
   * rule, i.e. BYMONTH.
   *
   * @param aType            The name of the component part
   * @param The component value
   */
  addComponent(aType: string, aValue: Array<any> | string) {
    const ucname = aType.toUpperCase()
    if (ucname in this.parts) {
      this.parts[ucname].push(aValue)
    } else {
      this.parts[ucname] = [aValue]
    }
  }

  /**
   * Sets the component value for the given by-part.
   *
   * @param aType        The component part name
   * @param aValues       The component values
   */
  setComponent(aType: string, aValues: Array<any>) {
    this.parts[aType.toUpperCase()] = aValues.slice()
  }

  /**
   * Gets (a copy) of the requested component value.
   *
   * @param aType        The component part name
   * @return The component part value
   */
  getComponent(aType: string): Array<any> {
    const ucname = aType.toUpperCase()
    return (ucname in this.parts ? this.parts[ucname].slice() : [])
  }

  /**
   * Retrieves the next occurrence after the given recurrence id. See the
   * guide on {@tutorial terminology} for more details.
   *
   * NOTE: Currently, this method iterates all occurrences from the start
   * date. It should not be called in a loop for performance reasons. If you
   * would like to get more than one occurrence, you can iterate the
   * occurrences manually, see the example on the
   * {@link Recur#iterator iterator} method.
   *
   * @param aStartTime        The start of the event series
   * @param aRecurrenceId     The date of the last occurrence
   * @return The next occurrence after
   */
  getNextOccurrence(aStartTime: Time, aRecurrenceId: Time): Time {
    const iter = this.iterator(aStartTime)
    let next
    do {
      next = iter.next()
    } while (next && next.compare(aRecurrenceId) <= 0)

    if (next && aRecurrenceId.zone) {
      next.zone = aRecurrenceId.zone
    }

    return next
  }

  /**
   * Sets up the current instance using members from the passed data object.
   * @param data An object with members of the recurrence
   */
  fromData(data: Partial<RecurOptions>) {
    for (const key in data) {
      const uckey = key.toUpperCase()

      if (uckey in partDesign) {
        if (Array.isArray(data[key])) {
          this.parts[uckey] = data[key]
        } else {
          this.parts[uckey] = [data[key]]
        }
      } else {
        this[key] = data[key]
      }
    }

    if (this.interval && typeof this.interval !== 'number') {
      optionDesign.INTERVAL(this.interval, this)
    }

    if (this.wkst && typeof this.wkst !== 'number') {
      this.wkst = Recur.icalDayToNumericDay(this.wkst)
    }

    if (this.until && !(this.until instanceof Time)) {
      this.until = Time.fromString(this.until)
    }
  }

  /**
   * The jCal representation of this recurrence type.
   */
  toJSON() {
    const res = Object.create(null)
    res.freq = this.freq

    if (this.count) {
      res.count = this.count
    }

    if (this.interval > 1) {
      res.interval = this.interval
    }

    for (const k in this.parts) {
      /* istanbul ignore if */
      if (!this.parts.hasOwnProperty(k)) {
        continue
      }
      const kparts = this.parts[k]
      if (Array.isArray(kparts) && kparts.length === 1) {
        res[k.toLowerCase()] = kparts[0]
      } else {
        res[k.toLowerCase()] = clone(this.parts[k])
      }
    }

    if (this.until) {
      res.until = this.until.toString()
    }
    if ('wkst' in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      res.wkst = Recur.numericDayToIcalDay(this.wkst)
    }
    return res
  }

  /**
   * The string representation of this recurrence rule.
   * @return {String}
   */
  toString(): string {
    // TODO retain order
    let str = 'FREQ=' + this.freq
    if (this.count) {
      str += ';COUNT=' + this.count
    }
    if (this.interval > 1) {
      str += ';INTERVAL=' + this.interval
    }
    for (const k in this.parts) {
      /* istanbul ignore else */
      if (this.parts.hasOwnProperty(k)) {
        str += ';' + k + '=' + this.parts[k]
      }
    }
    if (this.until) {
      str += ';UNTIL=' + this.until.toICALString()
    }
    if ('wkst' in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      str += ';WKST=' + Recur.numericDayToIcalDay(this.wkst)
    }
    return str
  }

  /**
   * Convert an ical representation of a day (SU, MO, etc..)
   * into a numeric value of that day.
   *
   * @param string     The iCalendar day name
   * @return Numeric value of given day
   */
  static icalDayToNumericDay(string: string): number {
    // XXX: this is here so we can deal
    //     with possibly invalid string values.

    return DOW_MAP[string]
  }

  /**
   * Convert a numeric day value into its ical representation (SU, MO, etc..)
   *
   * @param num        Numeric value of given day
   * @return The ICAL day value, e.g SU,MO,...
   */
  static numericDayToIcalDay(num: number): string {
    // XXX: this is here so we can deal with possibly invalid number values.
    //     Also, this allows consistent mapping between day numbers and day
    //     names for external users.
    return REVERSE_DOW_MAP[num]
  }

  /**
   * Creates a new {@link Recur} instance from the passed string.
   *
   * @param string         The string to parse
   * @return The created recurrence instance
   */
  static fromString(string: string): Recur {
    const data = Recur._stringToData(string, false)
    return new Recur(data)
  }

  /**
   * Creates a new {@link Recur} instance using members from the passed
   * data object.
   *
   * @param aData                              An object with members of the recurrence
   */
  static fromData(aData: Partial<RecurOptions>) {
    return new Recur(aData)
  }

  /**
   * Converts a recurrence string to a data object, suitable for the fromData
   * method.
   *
   * @param string     The string to parse
   * @param fmtIcal   If true, the string is considered to be an
   *                              iCalendar string
   * @return The recurrence instance
   */
  static _stringToData (string: string, fmtIcal: boolean): Recur {
    const dict = Object.create(null)

    // split is slower in FF but fast enough.
    // v8 however this is faster then manual split?
    const values = string.split(';')
    const len = values.length

    for (let i = 0; i < len; i++) {
      const parts = values[i].split('=')
      const ucname = parts[0].toUpperCase()
      const lcname = parts[0].toLowerCase()
      const name = (fmtIcal ? lcname : ucname)
      const value = parts[1]

      if (ucname in partDesign) {
        const partArr = value.split(',')
        let partArrIdx = 0
        const partArrLen = partArr.length

        for (; partArrIdx < partArrLen; partArrIdx++) {
          partArr[partArrIdx] = partDesign[ucname](partArr[partArrIdx])
        }
        dict[name] = (partArr.length === 1 ? partArr[0] : partArr)
      } else if (ucname in optionDesign) {
        optionDesign[ucname](value, dict, fmtIcal)
      } else {
        // Don't swallow unknown values. Just set them as they are.
        dict[lcname] = value
      }
    }

    return dict
  }
}

const parseNumericValue = (type, min, max) => (value) => {
  let result = value

  if (value[0] === '+') {
    result = value.substr(1)
  }

  result = strictParseInt(result)

  if (min !== undefined && value < min) {
    throw new Error(
      type + ': invalid value "' + value + '" must be > ' + min
    )
  }

  if (max !== undefined && value > max) {
    throw new Error(
      type + ': invalid value "' + value + '" must be < ' + min
    )
  }

  return result
}


const VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/
const VALID_BYDAY_PART = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/

/**
 * Possible frequency values for the FREQ part
 * (YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, SECONDLY)
 *
 * @typedef {String} frequencyValues
 * @memberof Recur
 */
export enum FrequencyValues {
  SECONDLY = 'SECONDLY',
  MINUTELY = 'MINUTELY',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

const ALLOWED_FREQ = [
  FrequencyValues.SECONDLY,
  FrequencyValues.MINUTELY,
  FrequencyValues.HOURLY,
  FrequencyValues.DAILY,
  FrequencyValues.WEEKLY,
  FrequencyValues.MONTHLY,
  FrequencyValues.YEARLY,
]

const optionDesign = {
  FREQ(value, dict) {
    // yes this is actually equal or faster then regex.
    // upside here is we can enumerate the valid values.
    if (ALLOWED_FREQ.indexOf(value) !== -1) {
      dict.freq = value
    } else {
      throw new Error(
        'invalid frequency "' + value + '" expected: "' +
        ALLOWED_FREQ.join(', ') + '"'
      )
    }
  },

  COUNT(value, dict) {
    dict.count = strictParseInt(value)
  },

  INTERVAL(value, dict) {
    dict.interval = strictParseInt(value)
    if (dict.interval < 1) {
      // 0 or negative values are not allowed, some engines seem to generate
      // it though. Assume 1 instead.
      dict.interval = 1
    }
  },

  UNTIL(value, dict, fmtIcal) {
    if (value.length > 10) {
      dict.until = design.icalendar.value['date-time'].fromICAL(value)
    } else {
      dict.until = design.icalendar.value.date.fromICAL(value)
    }
    if (!fmtIcal) {
      dict.until = Time.fromString(dict.until)
    }
  },

  WKST(value, dict) {
    if (VALID_DAY_NAMES.test(value)) {
      dict.wkst = Recur.icalDayToNumericDay(value)
    } else {
      throw new Error('invalid WKST value "' + value + '"')
    }
  }
}

const partDesign = {
  BYSECOND: parseNumericValue('BYSECOND', 0, 60),
  BYMINUTE: parseNumericValue('BYMINUTE', 0, 59),
  BYHOUR: parseNumericValue('BYHOUR', 0, 23),
  BYDAY(value) {
    if (VALID_BYDAY_PART.test(value)) {
      return value
    } else {
      throw new Error('invalid BYDAY value "' + value + '"')
    }
  },
  BYMONTHDAY: parseNumericValue('BYMONTHDAY', -31, 31),
  BYYEARDAY: parseNumericValue('BYYEARDAY', -366, 366),
  BYWEEKNO: parseNumericValue('BYWEEKNO', -53, 53),
  BYMONTH: parseNumericValue('BYMONTH', 0, 12),
  BYSETPOS: parseNumericValue('BYSETPOS', -366, 366)
}
