/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { Timezone } from './Timezone'
import { Component } from './Component'
import { parse } from './parse'
import { Event } from './Event'

/**
 * The ComponentParser is used to process a String or jCal Object, firing
 * callbacks for various found components, as well as completion.
 */
export class ComponentParser {
  /**
   * @example
   * var options = {
   *   // when false no events will be emitted for type
   *   parseEvent: true,
   *   parseTimezone: true
   * };
   *
   * var parser = new ICAL.ComponentParser(options);
   *
   * parser.onevent(eventComponent) {
   *   //...
   * }
   *
   * // ontimezone, etc...
   *
   * parser.oncomplete = function() {
   *
   * };
   *
   * parser.process(stringOrComponent);
   *
   * @param options Component parser options
   */
  constructor(options: {
    /** Whether events should be parsed */
    parseEvent?: boolean
    /** Whether timezones should be parsed */
    parseTimezeone?: boolean
  } = {}) {
    Object.assign(this, options)
  }

  /**
   * When true, parse events
   */
  parseEvent = true

  /**
   * When true, parse timezones
   */
  parseTimezone = true


  /* SAX like events here for reference */

  /**
   * Fired when parsing is complete
   * @callback
   */
  oncomplete = () => {}

  /**
   * Fired if an error occurs during parsing.
   *
   * @callback
   * @param err details of error
   */
  onerror: (err: Error) => void = () => {}

  /**
   * Fired when a top level component (VTIMEZONE) is found
   *
   * @callback
   * @param component     Timezone object
   */
  ontimezone: (component: Timezone) => void = () => {}

  /**
   * Fired when a top level component (VEVENT) is found.
   *
   * @callback
   * @param component    Top level component
   */
  onevent: (component: Event) => void = () => {}

  /**
   * Process a string or parse ical object.  This function itself will return
   * nothing but will start the parsing process.
   *
   * Events must be registered prior to calling this method.
   *
   * @param ical      The component to process,
   *        either in its final form, as a jCal Object, or string representation
   */
  process(ical: Component | string | any) {
    // ODO: this is sync now in the future we will have a incremental parser.
    if (typeof(ical) === 'string') {
      ical = parse(ical)
    }

    if (!(ical instanceof Component)) {
      ical = new Component(ical)
    }

    const components = ical.getAllSubcomponents()
    let i = 0
    const len = components.length
    let component

    for (; i < len; i++) {
      component = components[i]

      switch (component.name) {
        case 'vtimezone':
          if (this.parseTimezone) {
            const tzid = component.getFirstPropertyValue('tzid')
            if (tzid) {
              this.ontimezone(new Timezone({
                tzid,
                component
              }))
            }
          }
          break
        case 'vevent':
          if (this.parseEvent) {
            this.onevent(new Event(component))
          }
          break
        default:
          continue
      }
    }

    // XXX: ideally we should do a "nextTick" here
    //     so in all cases this is actually async.
    this.oncomplete()
  }
}
