/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { Component } from './Component'
import * as TimezoneService from './TimezoneService'

/**
 * The number of characters before iCalendar line folding should occur
 * @default 75
 */
export const foldLength: number = 75


/**
 * The character(s) to be used for a newline. The default value is provided by
 * rfc5545.
 * @default "\r\n"
 */
export const newLineChar: string = '\r\n'


/**
 * Compiles a list of all referenced TZIDs in all subcomponents and
 * removes any extra VTIMEZONE subcomponents. In addition, if any TZIDs
 * are referenced by a component, but a VTIMEZONE does not exist,
 * an attempt will be made to generate a VTIMEZONE using ICAL.TimezoneService.
 *
 * @param vcal     The top-level VCALENDAR component.
 * @return The ICAL.Component that was passed in.
 */
export function updateTimezones(vcal: Component): Component {
  let allsubs, properties, vtimezones, reqTzid, i, tzid

  if (!vcal || vcal.name !== 'vcalendar') {
    // not a top-level vcalendar component
    return vcal
  }

  // Store vtimezone subcomponents in an object reference by tzid.
  // Store properties from everything else in another array
  allsubs = vcal.getAllSubcomponents()
  properties = []
  vtimezones = {}
  for (i = 0; i < allsubs.length; i++) {
    if (allsubs[i].name === 'vtimezone') {
      tzid = allsubs[i].getFirstProperty('tzid').getFirstValue()
      vtimezones[tzid] = allsubs[i]
    } else {
      properties = properties.concat(allsubs[i].getAllProperties())
    }
  }

  // create an object with one entry for each required tz
  reqTzid = {}
  for (i = 0; i < properties.length; i++) {
    if ((tzid = properties[i].getParameter('tzid'))) {
      reqTzid[tzid] = true
    }
  }

  // delete any vtimezones that are not on the reqTzid list.
  for (i in vtimezones) {
    if (vtimezones.hasOwnProperty(i) && !reqTzid[i]) {
      vcal.removeSubcomponent(vtimezones[i])
    }
  }

  // create any missing, but registered timezones
  for (i in reqTzid) {
    if (
      reqTzid.hasOwnProperty(i) &&
      !vtimezones[i] &&
      TimezoneService.has(i)
    ) {
      vcal.addSubcomponent(TimezoneService.get(i)!.component!)
    }
  }

  return vcal
}


/**
 * Parses a string value that is expected to be an integer, when the valid is
 * not an integer throws a decoration error.
 *
 * @param string     Raw string input
 * @return           Parsed integer
 */
export function strictParseInt(string: string): number {
  const result = parseInt(string, 10)

  if (Number.isNaN(result)) {
    throw new TypeError(
      'Could not extract integer from "' + string + '"'
    )
  }

  return result
}

/**
 * Creates or returns a class instance of a given type with the initialization
 * data if the data is not already an instance of the given type.
 *
 * @example
 * var time = new ICAL.Time(...);
 * var result = ICAL.helpers.formatClassType(time, ICAL.Time);
 *
 * (result instanceof ICAL.Time)
 * // => true
 *
 * result = ICAL.helpers.formatClassType({}, ICAL.Time);
 * (result isntanceof ICAL.Time)
 * // => true
 *
 *
 * @param data       object initialization data
 * @param type       object type (like ICAL.Time)
 * @return An instance of the found type.
 */
export function formatClassType<T>(data: Partial<T>, type: { new (...args): T }): T {
  if (data instanceof type) {
    return data
  }
  return new type(data)
}

/**
 * Identical to indexOf but will only match values when they are not preceded
 * by a backslash character.
 *
 * @param buffer         String to search
 * @param search         Value to look for
 * @param pos            Start position
 * @return               The position, or -1 if not found
 */
export function unescapedIndexOf(buffer: string, search: string, pos?: number): number {
  while ((pos = buffer.indexOf(search, pos)) !== -1) {
    if (pos && pos > 0 && buffer[pos - 1] === '\\') {
      pos += 1
    } else {
      return pos
    }
  }
  return -1
}

/**
 * Find the index for insertion using binary search.
 *
 * @param list    The list to search
 * @param seekVal The value to insert
 * @param cmpfunc The comparison func, that can compare two seekVals
 * @return The insert position
 */
export function binsearchInsert<T>(
  list: Array<T>,
  seekVal: T,
  cmpfunc: (arg0: T, arg1: T) => number
): number {
  if (!list.length)
    return 0

  let low = 0
  let high = list.length - 1
  let mid = 0
  let cmpval = 0

  while (low <= high) {
    mid = low + Math.floor((high - low) / 2)
    cmpval = cmpfunc(seekVal, list[mid])

    if (cmpval < 0)
      high = mid - 1
    else if (cmpval > 0)
      low = mid + 1
    else
      break
  }

  if (cmpval < 0)
    return mid // insertion is displacing, so use mid outright.
  else if (cmpval > 0)
    return mid + 1
  else
    return mid
}

/**
 * Clone the passed object or primitive. By default a shallow clone will be
 * executed.
 *
 * @param aSrc            The thing to clone
 * @param aDeep    If true, a deep clone will be performed
 * @return The copy of the thing
 */
export function clone<T>(aSrc: T, aDeep?: boolean): T {
  if (!aSrc || typeof aSrc !== 'object') {
    return aSrc
  } else if (aSrc instanceof Date) {
    return new Date(aSrc.getTime()) as any
  } else if ('clone' in aSrc) {
    return aSrc['clone']()
  } else if (Array.isArray(aSrc)) {
    const arr: any[] = []
    for (let i = 0; i < aSrc.length; i++) {
      arr.push(aDeep ? clone(aSrc[i], true) : aSrc[i])
    }
    return arr as any
  } else {
    const obj: any = {}
    for (const name in aSrc) {
      // uses prototype method to allow use of Object.create(null);
      /* istanbul ignore else */
      if (Object.prototype.hasOwnProperty.call(aSrc, name)) {
        if (aDeep) {
          obj[name] = clone(aSrc[name], true)
        } else {
          obj[name] = aSrc[name]
        }
      }
    }
    return obj
  }
}

/**
 * Performs iCalendar line folding. A line ending character is inserted and
 * the next line begins with a whitespace.
 *
 * @example
 * SUMMARY:This line will be fold
 *  ed right in the middle of a word.
 *
 * @param line   The line to fold
 * @return       The folded line
 */
export function foldline(line = ''): string {
  let result = ''

  while (line.length) {
    result += newLineChar + ' ' + line.substr(0, foldLength)
    line = line.substr(foldLength)
  }
  return result.substr(newLineChar.length + 1)
}

/**
 * Pads the given string or number with zeros so it will have at least two
 * characters.
 *
 * @param data    The string or number to pad
 * @return               The number padded as a string
 */
export function pad2(data: string | number): string {
  if (typeof(data) !== 'string') {
    // handle fractions.
    if (typeof(data) === 'number') {
      data = parseInt(String(data))
    }
    data = String(data)
  }

  const len = data.length

  switch (len) {
    case 0:
      return '00'
    case 1:
      return '0' + data
    default:
      return data
  }
}

/**
 * Truncates the given number, correctly handling negative numbers.
 *
 * @param num     The number to truncate
 * @return           The truncated number
 */
export function trunc(num: number): number {
  return (num < 0 ? Math.ceil(num) : Math.floor(num))
}
