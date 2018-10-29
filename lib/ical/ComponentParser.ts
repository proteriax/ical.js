/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */
import { EventEmitter } from 'events'
import { Timezone } from './Timezone'
import { Component } from './Component'
import { parse } from './parse'
import { Event } from './Event'
import StrictEventEmitter from 'strict-event-emitter-types'

interface ParserEvents {
  /**
   * Fired when parsing is complete
   */
  complete(): void

  /**
   * Fired if an error occurs during parsing.
   * @param err details of error
   */
  error(err: Error): void

  /**
   * Fired when a top level component (VTIMEZONE) is found
   * @param timezone Timezone object
   */
  timezone(timezone: Timezone): void

  /**
   * Fired when a top level component (VEVENT) is found.
   * @param event Top level component
   */
  event(event: Event): void
}

interface ComponentParser extends StrictEventEmitter<EventEmitter, ParserEvents> {
  process(ical: Component | string | any): Promise<void>
}

/**
 * The ComponentParser is used to process a String or jCal Object, firing
 * callbacks for various found components, as well as completion.
 *
 * @example
 * var options = {
 *   // when false no events will be emitted for type
 *   parseEvent: true,
 *   parseTimezone: true
 * };
 *
 * var parser = ICAL.ComponentParser(options);
 *
 * parser.on('event', (eventComponent) => {
 *   //...
 * })
 *
 * // ontimezone, etc...
 *
 * parser.on('complete', () => {
 *
 * });
 *
 * parser.process(stringOrComponent);
 *
 * @param options Component parser options
 */
export function ComponentParser({
  /** Whether events should be parsed */
  parseEvent = true,
  /** Whether timezones should be parsed */
  parseTimezone = true,
} = {}) {
  const ee: ComponentParser = new EventEmitter() as any

  /**
   * Process a string or parse ical object.  This function itself will return
   * nothing but will start the parsing process.
   *
   * Events must be registered prior to calling this method.
   *
   * @param ical      The component to process,
   *        either in its final form, as a jCal Object, or string representation
   */
  ee.process = async function process(ical: Component | string | any) {
    // ODO: this is sync now in the future we will have a incremental parser.
    if (typeof ical === 'string') {
      ical = parse(ical)
    }

    if (!(ical instanceof Component)) {
      ical = new Component(ical)
    }

    for (const component of ical.getAllSubcomponents()) {
      switch (component.name) {
        case 'vtimezone':
          if (parseTimezone) {
            const tzid = component.getFirstPropertyValue('tzid')
            if (tzid) {
              ee.emit('timezone', new Timezone({ tzid, component }))
            }
          }
          break
        case 'vevent':
          if (parseEvent) {
            ee.emit('event', new Event(component))
          }
          break
        default:
          continue
      }
    }

    await 0
    // XXX: ideally we should do a "nextTick" here
    //     so in all cases this is actually async.
    ee.emit('complete')
  }
  return ee
}
