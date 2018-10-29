/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { Duration } from './Duration'
import { VCardTime } from './VCardTime'
import { UtcOffset } from './UTCOffset'
import { Time } from './Time'
import { Binary } from './Binary'
import { Period } from './Period'
import { Recur, RecurOptions } from './Recur'
import { Property } from './Property'

const FROM_ICAL_NEWLINE = /\\\\|\\;|\\,|\\[Nn]/g
const TO_ICAL_NEWLINE = /\\|;|,|\n/g
const FROM_VCARD_NEWLINE = /\\\\|\\,|\\[Nn]/g
const TO_VCARD_NEWLINE = /\\|,|\n/g

/**
 * A designSet describes value, parameter and property data. It is used by
 * ther parser and stringifier in components and properties to determine they
 * should be represented.
 */
export interface DesignSet {
  /** Definitions for value types, keys are type names */
  value: { [key: string]: Partial<Value> }
  /** Definitions for params, keys are param names */
  param: { [key: string]: { [key: string]: any } }
  /** Defintions for properties, keys are property names */
  property: { [key: string]: Partial<Prop> }
}
interface Prop {
  defaultType: string
  allowedTypes: string[]
  multiValue: string
  structuredValue: string
  detectType(string: string): string
}

interface Value<T = any> {
  fromICAL(aValue: T, structuredEscape?: string): T | undefined
  toICAL(aValue: T, structuredEscape?: string): T
  decorate(aValue: any, props?: object): T
  undecorate(aValue: T, props?: object): any
  values?: T[]
  matches?: RegExp
}

function createTextType(fromNewline: RegExp, toNewline: RegExp): Partial<Value> {
  return {
    matches: /.*/,
    fromICAL(aValue: string, structuredEscape?: string) {
      return replaceNewline(aValue, fromNewline, structuredEscape)
    },
    toICAL(aValue: string, structuredEscape?: string) {
      let regEx = toNewline
      if (structuredEscape)
        regEx = new RegExp(regEx.source + '|' + structuredEscape)

      return aValue.replace(regEx, (str) => {
        switch (str) {
        case '\\':
          return '\\\\'
        case ';':
          return '\\;'
        case ',':
          return '\\,'
        case '\n':
          return '\\n'
        /* istanbul ignore next */
        default:
          return str
        }
      })
    }
  }
}

// default types used multiple times
const DEFAULT_TYPE_TEXT = { defaultType: 'text' }
const DEFAULT_TYPE_TEXT_MULTI = { defaultType: 'text', multiValue: ',' }
const DEFAULT_TYPE_TEXT_STRUCTURED = { defaultType: 'text', structuredValue: ';' }
const DEFAULT_TYPE_INTEGER = { defaultType: 'integer' }
const DEFAULT_TYPE_DATETIME_DATE = { defaultType: 'date-time', allowedTypes: ['date-time', 'date'] }
const DEFAULT_TYPE_DATETIME = { defaultType: 'date-time' }
const DEFAULT_TYPE_URI = { defaultType: 'uri' }
const DEFAULT_TYPE_UTCOFFSET = { defaultType: 'utc-offset' }
const DEFAULT_TYPE_RECUR = { defaultType: 'recur' }
const DEFAULT_TYPE_DATE_ANDOR_TIME = { defaultType: 'date-and-or-time', allowedTypes: ['date-time', 'date', 'text'] }

function replaceNewlineReplace(string: string) {
  switch (string) {
    case '\\\\':
      return '\\'
    case '\\;':
      return ';'
    case '\\,':
      return ','
    case '\\n':
    case '\\N':
      return '\n'
    /* istanbul ignore next */
    default:
      return string
  }
}

function replaceNewline(value: string, newline: RegExp, structuredEscape?: string) {
  // avoid regex when possible.
  if (value.indexOf('\\') === -1) {
    return value
  }
  if (structuredEscape)
    newline = new RegExp(newline.source + '|\\\\' + structuredEscape)
  return value.replace(newline, replaceNewlineReplace)
}

const commonProperties = {
  categories: DEFAULT_TYPE_TEXT_MULTI,
  url: DEFAULT_TYPE_URI,
  version: DEFAULT_TYPE_TEXT,
  uid: DEFAULT_TYPE_TEXT,
}

const commonValues = {
  boolean: {
    values: ['TRUE', 'FALSE'],
    fromICAL(aValue: string): boolean {
      switch (aValue) {
        case 'TRUE':
          return true
        case 'FALSE':
          return false
        default:
          // TODO: parser warning
          return false
      }
    },
    toICAL(aValue: boolean): string {
      if (aValue) {
        return 'TRUE'
      }
      return 'FALSE'
    }
  },
  float: {
    matches: /^[+-]?\d+\.\d+$/,
    fromICAL(aValue: string): number {
      const parsed = parseFloat(aValue)
      if (Number.isNaN(parsed)) {
        // TODO: parser warning
        return 0.0
      }
      return parsed
    },
    toICAL(aValue: number): string {
      return String(aValue)
    }
  },
  integer: {
    fromICAL(aValue: string): number {
      const parsed = parseInt(aValue)
      if (Number.isNaN(parsed)) {
        return 0
      }
      return parsed
    },
    toICAL(aValue: number): string {
      return String(aValue)
    }
  },
  'utc-offset': {
    toICAL(aValue: string): string {
      if (aValue.length < 7) {
        // no seconds
        // -0500
        return aValue.substr(0, 3) +
                aValue.substr(4, 2)
      } else {
        // seconds
        // -050000
        return aValue.substr(0, 3) +
                aValue.substr(4, 2) +
                aValue.substr(7, 2)
      }
    },

    fromICAL(aValue: string): string {
      if (aValue.length < 6) {
        // no seconds
        // -05:00
        return aValue.substr(0, 3) + ':' +
                aValue.substr(3, 2)
      } else {
        // seconds
        // -05:00:00
        return aValue.substr(0, 3) + ':' +
                aValue.substr(3, 2) + ':' +
                aValue.substr(5, 2)
      }
    },

    decorate(aValue: string): UtcOffset {
      return UtcOffset.fromString(aValue)
    },

    undecorate(aValue: UtcOffset): string {
      return aValue.toString()
    }
  }
}

const icalParams = {
  // Although the syntax is DQUOTE uri DQUOTE, I don't think we should
  // enfoce anything aside from it being a valid content line.
  //
  // At least some params require - if multi values are used - DQUOTEs
  // for each of its values - e.g. delegated-from="uri1","uri2"
  // To indicate this, I introduced the new k/v pair
  // multiValueSeparateDQuote: true
  //
  // "ALTREP": { ... },

  // CN just wants a param-value
  // "CN": { ... }

  cutype: {
    values: ['INDIVIDUAL', 'GROUP', 'RESOURCE', 'ROOM', 'UNKNOWN'],
    allowXName: true,
    allowIanaToken: true
  },

  'delegated-from': {
    valueType: 'cal-address',
    multiValue: ',',
    multiValueSeparateDQuote: true
  },
  'delegated-to': {
    valueType: 'cal-address',
    multiValue: ',',
    multiValueSeparateDQuote: true
  },
  // "DIR": { ... }, // See ALTREP
  encoding: {
    values: ['8BIT', 'BASE64']
  },
  // "FMTTYPE": { ... }, // See ALTREP
  fbtype: {
    values: ['FREE', 'BUSY', 'BUSY-UNAVAILABLE', 'BUSY-TENTATIVE'],
    allowXName: true,
    allowIanaToken: true
  },
  // "LANGUAGE": { ... }, // See ALTREP
  member: {
    valueType: 'cal-address',
    multiValue: ',',
    multiValueSeparateDQuote: true
  },
  partstat: {
    // TODO These values are actually different per-component
    values: ['NEEDS-ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE',
              'DELEGATED', 'COMPLETED', 'IN-PROCESS'],
    allowXName: true,
    allowIanaToken: true
  },
  range: {
    values: ['THISLANDFUTURE']
  },
  related: {
    values: ['START', 'END']
  },
  reltype: {
    values: ['PARENT', 'CHILD', 'SIBLING'],
    allowXName: true,
    allowIanaToken: true
  },
  role: {
    values: ['REQ-PARTICIPANT', 'CHAIR',
              'OPT-PARTICIPANT', 'NON-PARTICIPANT'],
    allowXName: true,
    allowIanaToken: true
  },
  rsvp: {
    values: ['TRUE', 'FALSE']
  },
  'sent-by': {
    valueType: 'cal-address'
  },
  tzid: {
    matches: /^\//
  },
  value: {
    // since the value here is a 'type' lowercase is used.
    values: ['binary', 'boolean', 'cal-address', 'date', 'date-time',
              'duration', 'float', 'integer', 'period', 'recur', 'text',
              'time', 'uri', 'utc-offset'],
    allowXName: true,
    allowIanaToken: true
  }
}

// When adding a value here, be sure to add it to the parameter types!
const icalValues = {
  ...commonValues,
  text: createTextType(FROM_ICAL_NEWLINE, TO_ICAL_NEWLINE),

  uri: {
    // TODO
    /* ... */
  },

  binary: {
    decorate(aString: string): Binary {
      return Binary.fromString(aString)
    },
    undecorate(aBinary: Binary): string {
      return aBinary.toString()
    }
  },
  'cal-address': {
    // needs to be an uri
  },
  date: {
    decorate(aValue: string): Time {
      return Time.fromDateString(aValue)
    },
    /**
     * undecorates a time object.
     */
    undecorate(aValue: Time): string {
      return aValue.toString()
    },

    fromICAL(aValue: string): string {
      // from: 20120901
      // to: 2012-09-01
      return aValue.substr(0, 4) + '-' +
              aValue.substr(4, 2) + '-' +
              aValue.substr(6, 2)
    },

    toICAL(aValue: string): string {
      // from: 2012-09-01
      // to: 20120901

      if (aValue.length > 11) {
        // TODO: serialize warning?
        return aValue
      }

      return aValue.substr(0, 4) +
              aValue.substr(5, 2) +
              aValue.substr(8, 2)
    }
  },
  'date-time': {
    fromICAL(aValue: string): string {
      // from: 20120901T130000
      // to: 2012-09-01T13:00:00
      let result = aValue.substr(0, 4) + '-' +
                    aValue.substr(4, 2) + '-' +
                    aValue.substr(6, 2) + 'T' +
                    aValue.substr(9, 2) + ':' +
                    aValue.substr(11, 2) + ':' +
                    aValue.substr(13, 2)

      if (aValue[15] && aValue[15] === 'Z') {
        result += 'Z'
      }

      return result
    },

    toICAL(aValue: string): string {
      // from: 2012-09-01T13:00:00
      // to: 20120901T130000

      if (aValue.length < 19) {
        // TODO: error
        return aValue
      }

      let result = aValue.substr(0, 4) +
                    aValue.substr(5, 2) +
                    // grab the (DDTHH) segment
                    aValue.substr(8, 5) +
                    // MM
                    aValue.substr(14, 2) +
                    // SS
                    aValue.substr(17, 2)

      if (aValue[19] && aValue[19] === 'Z') {
        result += 'Z'
      }

      return result
    },

    decorate(aValue: string, aProp?: Property): Time {
      return Time.fromDateTimeString(aValue, aProp)
    },

    undecorate(aValue: Time): string {
      return aValue.toString()
    }
  },
  duration: {
    decorate(aValue: string): Duration {
      return Duration.fromString(aValue)
    },
    undecorate(aValue: Duration): string {
      return aValue.toString()
    }
  },
  period: {
    fromICAL(string: string): string[] {
      const parts = string.split('/')
      parts[0] = icalValues['date-time'].fromICAL(parts[0])

      if (!Duration.isValueString(parts[1])) {
        parts[1] = icalValues['date-time'].fromICAL(parts[1])
      }

      return parts
    },

    toICAL(parts: string[]): string {
      parts[0] = icalValues['date-time'].toICAL(parts[0])

      if (!Duration.isValueString(parts[1])) {
        parts[1] = icalValues['date-time'].toICAL(parts[1])
      }

      return parts.join('/')
    },

    decorate(aValue: [string, string], aProp): Period {
      return Period.fromJSON(aValue, aProp)
    },

    undecorate(aValue: Period): any {
      return aValue.toJSON()
    }
  },
  recur: {
    fromICAL(string: string): Recur {
      return Recur._stringToData(string, true)
    },

    toICAL(data: Recur): string {
      let str = ''
      for (const k in data) {
        /* istanbul ignore if */
        if (!Object.prototype.hasOwnProperty.call(data, k)) {
          continue
        }
        let val = data[k]
        if (k === 'until') {
          if (val.length > 10) {
            val = icalValues['date-time'].toICAL(val)
          } else {
            val = icalValues.date.toICAL(val)
          }
        } else if (k === 'wkst') {
          if (typeof val === 'number') {
            val = Recur.numericDayToIcalDay(val)
          }
        } else if (Array.isArray(val)) {
          val = val.join(',')
        }
        str += k.toUpperCase() + '=' + val + ';'
      }
      return str.substr(0, str.length - 1)
    },

    decorate(aValue: Partial<RecurOptions>): Recur {
      return Recur.fromData(aValue)
    },

    undecorate(aRecur: Recur): object {
      return aRecur.toJSON()
    }
  },

  time: {
    fromICAL(aValue: string): string {
      // from: MMHHSS(Z)?
      // to: HH:MM:SS(Z)?
      if (aValue.length < 6) {
        // TODO: parser exception?
        return aValue
      }

      // HH::MM::SSZ?
      let result = aValue.substr(0, 2) + ':' +
                    aValue.substr(2, 2) + ':' +
                    aValue.substr(4, 2)

      if (aValue[6] === 'Z') {
        result += 'Z'
      }

      return result
    },

    toICAL(aValue: string): string {
      // from: HH:MM:SS(Z)?
      // to: MMHHSS(Z)?
      if (aValue.length < 8) {
        // TODO: error
        return aValue
      }

      let result = aValue.substr(0, 2) +
                    aValue.substr(3, 2) +
                    aValue.substr(6, 2)

      if (aValue[8] === 'Z') {
        result += 'Z'
      }

      return result
    }
  }
}

const icalProperties = {
  ...commonProperties,

  action: DEFAULT_TYPE_TEXT,
  attach: { defaultType: 'uri' },
  attendee: { defaultType: 'cal-address' },
  calscale: DEFAULT_TYPE_TEXT,
  class: DEFAULT_TYPE_TEXT,
  comment: DEFAULT_TYPE_TEXT,
  completed: DEFAULT_TYPE_DATETIME,
  contact: DEFAULT_TYPE_TEXT,
  created: DEFAULT_TYPE_DATETIME,
  description: DEFAULT_TYPE_TEXT,
  dtend: DEFAULT_TYPE_DATETIME_DATE,
  dtstamp: DEFAULT_TYPE_DATETIME,
  dtstart: DEFAULT_TYPE_DATETIME_DATE,
  due: DEFAULT_TYPE_DATETIME_DATE,
  duration: { defaultType: 'duration' },
  exdate: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date'],
    multiValue: ','
  },
  exrule: DEFAULT_TYPE_RECUR,
  freebusy: { defaultType: 'period', multiValue: ',' },
  geo: { defaultType: 'float', structuredValue: ';' },
  'last-modified': DEFAULT_TYPE_DATETIME,
  location: DEFAULT_TYPE_TEXT,
  method: DEFAULT_TYPE_TEXT,
  organizer: { defaultType: 'cal-address' },
  'percent-complete': DEFAULT_TYPE_INTEGER,
  priority: DEFAULT_TYPE_INTEGER,
  prodid: DEFAULT_TYPE_TEXT,
  'related-to': DEFAULT_TYPE_TEXT,
  repeat: DEFAULT_TYPE_INTEGER,
  rdate: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date', 'period'],
    multiValue: ',',
    detectType(string: string) {
      if (string.indexOf('/') !== -1) {
        return 'period'
      }
      return (string.indexOf('T') === -1) ? 'date' : 'date-time'
    }
  },
  'recurrence-id': DEFAULT_TYPE_DATETIME_DATE,
  resources: DEFAULT_TYPE_TEXT_MULTI,
  'request-status': DEFAULT_TYPE_TEXT_STRUCTURED,
  rrule: DEFAULT_TYPE_RECUR,
  sequence: DEFAULT_TYPE_INTEGER,
  status: DEFAULT_TYPE_TEXT,
  summary: DEFAULT_TYPE_TEXT,
  transp: DEFAULT_TYPE_TEXT,
  trigger: { defaultType: 'duration', allowedTypes: ['duration', 'date-time'] },
  tzoffsetfrom: DEFAULT_TYPE_UTCOFFSET,
  tzoffsetto: DEFAULT_TYPE_UTCOFFSET,
  tzurl: DEFAULT_TYPE_URI,
  tzid: DEFAULT_TYPE_TEXT,
  tzname: DEFAULT_TYPE_TEXT
}

// When adding a value here, be sure to add it to the parameter types!
const vcardValues = {
  ...commonValues,
  text: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
  uri: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),

  date: {
    decorate(aValue: string): VCardTime {
      return VCardTime.fromDateAndOrTimeString(aValue, 'date')
    },
    undecorate(aValue: VCardTime): string {
      return aValue.toString()
    },
    fromICAL(aValue: string): string {
      if (aValue.length === 8) {
        return icalValues.date.fromICAL(aValue)
      } else if (aValue[0] === '-' && aValue.length === 6) {
        return aValue.substr(0, 4) + '-' + aValue.substr(4)
      } else {
        return aValue
      }
    },
    toICAL(aValue: string): string {
      if (aValue.length === 10) {
        return icalValues.date.toICAL(aValue)
      } else if (aValue[0] === '-' && aValue.length === 7) {
        return aValue.substr(0, 4) + aValue.substr(5)
      } else {
        return aValue
      }
    }
  },

  time: {
    decorate(aValue: string): VCardTime {
      return VCardTime.fromDateAndOrTimeString('T' + aValue, 'time')
    },
    undecorate(aValue: VCardTime): string {
      return aValue.toString()
    },
    fromICAL(aValue: string): string {
      const splitzone = vcardValues.time._splitZone(aValue, true)
      let zone = splitzone[0], value = splitzone[1]

      // console.log("SPLIT: ",splitzone);

      if (value.length === 6) {
        value = value.substr(0, 2) + ':' +
                value.substr(2, 2) + ':' +
                value.substr(4, 2)
      } else if (value.length === 4 && value[0] !== '-') {
        value = value.substr(0, 2) + ':' + value.substr(2, 2)
      } else if (value.length === 5) {
        value = value.substr(0, 3) + ':' + value.substr(3, 2)
      }

      if (zone.length === 5 && (zone[0] === '-' || zone[0] === '+')) {
        zone = zone.substr(0, 3) + ':' + zone.substr(3)
      }

      return value + zone
    },

    toICAL(aValue: string): string {
      const splitzone = vcardValues.time._splitZone(aValue)
      let zone = splitzone[0], value = splitzone[1]

      if (value.length === 8) {
        value = value.substr(0, 2) +
                value.substr(3, 2) +
                value.substr(6, 2)
      } else if (value.length === 5 && value[0] !== '-') {
        value = value.substr(0, 2) + value.substr(3, 2)
      } else if (value.length === 6) {
        value = value.substr(0, 3) + value.substr(4, 2)
      }

      if (zone.length === 6 && (zone[0] === '-' || zone[0] === '+')) {
        zone = zone.substr(0, 3) + zone.substr(4)
      }

      return value + zone
    },

    _splitZone(aValue: string, isFromIcal?: boolean): [string, string] {
      const lastChar = aValue.length - 1
      const signChar = aValue.length - (isFromIcal ? 5 : 6)
      const sign = aValue[signChar]
      let zone, value

      if (aValue[lastChar] === 'Z') {
        zone = aValue[lastChar]
        value = aValue.substr(0, lastChar)
      } else if (aValue.length > 6 && (sign === '-' || sign === '+')) {
        zone = aValue.substr(signChar)
        value = aValue.substr(0, signChar)
      } else {
        zone = ''
        value = aValue
      }

      return [zone, value]
    }
  },

  'date-time': {
    decorate(aValue: string): VCardTime {
      return VCardTime.fromDateAndOrTimeString(aValue, 'date-time')
    },

    undecorate(aValue: VCardTime): string {
      return aValue.toString()
    },

    fromICAL(aValue: string): string {
      return vcardValues['date-and-or-time'].fromICAL(aValue)
    },

    toICAL(aValue: string): string {
      return vcardValues['date-and-or-time'].toICAL(aValue)
    }
  },

  'date-and-or-time': {
    decorate(aValue: string): VCardTime {
      return VCardTime.fromDateAndOrTimeString(aValue, 'date-and-or-time')
    },

    undecorate(aValue: VCardTime): string {
      return aValue.toString()
    },

    fromICAL(aValue: string): string {
      const parts = aValue.split('T')
      return (parts[0] ? vcardValues.date.fromICAL(parts[0]) : '') +
              (parts[1] ? 'T' + vcardValues.time.fromICAL(parts[1]) : '')
    },

    toICAL(aValue: string): string {
      const parts = aValue.split('T')
      return vcardValues.date.toICAL(parts[0]) +
              (parts[1] ? 'T' + vcardValues.time.toICAL(parts[1]) : '')

    }
  },
  timestamp: icalValues['date-time'],
  'language-tag': {
    matches: /^[a-zA-Z0-9-]+$/ // Could go with a more strict regex here
  }
}

const vcardParams = {
  type: {
    valueType: 'text',
    multiValue: ','
  },
  value: {
    // since the value here is a 'type' lowercase is used.
    values: ['text', 'uri', 'date', 'time', 'date-time', 'date-and-or-time',
              'timestamp', 'boolean', 'integer', 'float', 'utc-offset',
              'language-tag'],
    allowXName: true,
    allowIanaToken: true,
  }
}

const vcardProperties = {
  ...commonProperties,
  adr: { defaultType: 'text', structuredValue: ';', multiValue: ',' },
  anniversary: DEFAULT_TYPE_DATE_ANDOR_TIME,
  bday: DEFAULT_TYPE_DATE_ANDOR_TIME,
  caladruri: DEFAULT_TYPE_URI,
  caluri: DEFAULT_TYPE_URI,
  clientpidmap: DEFAULT_TYPE_TEXT_STRUCTURED,
  email: DEFAULT_TYPE_TEXT,
  fburl: DEFAULT_TYPE_URI,
  fn: DEFAULT_TYPE_TEXT,
  gender: DEFAULT_TYPE_TEXT_STRUCTURED,
  geo: DEFAULT_TYPE_URI,
  impp: DEFAULT_TYPE_URI,
  key: DEFAULT_TYPE_URI,
  kind: DEFAULT_TYPE_TEXT,
  lang: { defaultType: 'language-tag' },
  logo: DEFAULT_TYPE_URI,
  member: DEFAULT_TYPE_URI,
  n: { defaultType: 'text', structuredValue: ';', multiValue: ',' },
  nickname: DEFAULT_TYPE_TEXT_MULTI,
  note: DEFAULT_TYPE_TEXT,
  org: { defaultType: 'text', structuredValue: ';' },
  photo: DEFAULT_TYPE_URI,
  related: DEFAULT_TYPE_URI,
  rev: { defaultType: 'timestamp' },
  role: DEFAULT_TYPE_TEXT,
  sound: DEFAULT_TYPE_URI,
  source: DEFAULT_TYPE_URI,
  tel: { defaultType: 'uri', allowedTypes: ['uri', 'text'] },
  title: DEFAULT_TYPE_TEXT,
  tz: { defaultType: 'text', allowedTypes: ['text', 'utc-offset', 'uri'] },
  xml: DEFAULT_TYPE_TEXT,
}

const vcard3Values = {
  ...commonValues,
  binary: icalValues.binary,
  date: vcardValues.date,
  'date-time': vcardValues['date-time'],
  'phone-number': {
    // TODO
    /* ... */
  },
  uri: icalValues.uri,
  text: icalValues.text,
  time: icalValues.time,
  vcard: icalValues.text,
  'utc-offset': {
    toICAL(aValue: string): string {
      return aValue.substr(0, 7)
    },

    fromICAL(aValue: string): string {
      return aValue.substr(0, 7)
    },

    decorate(aValue: string): UtcOffset {
      return UtcOffset.fromString(aValue)
    },

    undecorate(aValue: UtcOffset): string {
      return aValue.toString()
    }
  }
}

const vcard3Params = {
  type: {
    valueType: 'text',
    multiValue: ','
  },
  value: {
    // since the value here is a 'type' lowercase is used.
    values: ['text', 'uri', 'date', 'date-time', 'phone-number', 'time',
              'boolean', 'integer', 'float', 'utc-offset', 'vcard', 'binary'],
    allowXName: true,
    allowIanaToken: true,
  },
}

const vcard3Properties = {
  ...commonProperties,
  fn: DEFAULT_TYPE_TEXT,
  n: { defaultType: 'text', structuredValue: ';', multiValue: ',' },
  nickname: DEFAULT_TYPE_TEXT_MULTI,
  photo: { defaultType: 'binary', allowedTypes: ['binary', 'uri'] },
  bday: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date'],
    detectType(string: string) {
      return (string.indexOf('T') === -1) ? 'date' : 'date-time'
    }
  },

  adr: { defaultType: 'text', structuredValue: ';', multiValue: ',' },
  label: DEFAULT_TYPE_TEXT,

  tel: { defaultType: 'phone-number' },
  email: DEFAULT_TYPE_TEXT,
  mailer: DEFAULT_TYPE_TEXT,

  tz: { defaultType: 'utc-offset', allowedTypes: ['utc-offset', 'text'] },
  geo: { defaultType: 'float', structuredValue: ';' },

  title: DEFAULT_TYPE_TEXT,
  role: DEFAULT_TYPE_TEXT,
  logo: { defaultType: 'binary', allowedTypes: ['binary', 'uri'] },
  agent: { defaultType: 'vcard', allowedTypes: ['vcard', 'text', 'uri'] },
  org: DEFAULT_TYPE_TEXT_STRUCTURED,

  note: DEFAULT_TYPE_TEXT_MULTI,
  prodid: DEFAULT_TYPE_TEXT,
  rev: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date'],
    detectType(string: string) {
      return (string.indexOf('T') === -1) ? 'date' : 'date-time'
    }
  },
  'sort-string': DEFAULT_TYPE_TEXT,
  sound: { defaultType: 'binary', allowedTypes: ['binary', 'uri'] },

  class: DEFAULT_TYPE_TEXT,
  key: { defaultType: 'binary', allowedTypes: ['binary', 'text'] }
}

/**
 * iCalendar design set
 */
const icalSet = {
  value: icalValues,
  param: icalParams,
  property: icalProperties
}

/**
 * vCard 4.0 design set
 */
const vcardSet: DesignSet = {
  value: vcardValues,
  param: vcardParams,
  property: vcardProperties
}

/**
 * vCard 3.0 design set
 */
const vcard3Set: DesignSet = {
  value: vcard3Values,
  param: vcard3Params,
  property: vcard3Properties
}

/**
 * The design data, used by the parser to determine types for properties and
 * other metadata needed to produce correct jCard/jCal data.
 */
export let design = {
  /**
   * The default set for new properties and components if none is specified.
   */
  defaultSet: icalSet,

  /**
   * The default type for unknown properties
   */
  defaultType: 'unknown',

  /**
   * Holds the design set for known top-level components
   *
   * @property vcard       vCard VCARD
   * @property vevent      iCalendar VEVENT
   * @property vtodo       iCalendar VTODO
   * @property vjournal    iCalendar VJOURNAL
   * @property valarm      iCalendar VALARM
   * @property vtimezone   iCalendar VTIMEZONE
   * @property daylight    iCalendar DAYLIGHT
   * @property standard    iCalendar STANDARD
   *
   * @example
   * var propertyName = 'fn';
   * var componentDesign = design.components.vcard;
   * var propertyDetails = componentDesign.property[propertyName];
   * if (propertyDetails.defaultType == 'text') {
   *   // Yep, sure is...
   * }
   */
  components: {
    vcard: vcardSet,
    vcard3: vcard3Set,
    vevent: icalSet,
    vtodo: icalSet,
    vjournal: icalSet,
    valarm: icalSet,
    vtimezone: icalSet,
    daylight: icalSet,
    standard: icalSet
  },

  /**
   * The design set for iCalendar (rfc5545/rfc7265) components.
   */
  icalendar: icalSet,

  /**
   * The design set for vCard (rfc6350/rfc7095) components.
   */
  vcard: vcardSet,

  /**
   * The design set for vCard (rfc2425/rfc2426/rfc7095) components.
   */
  vcard3: vcard3Set,

  /**
   * Gets the design set for the given component name.
   *
   * @param componentName        The name of the component
   * @return The design set for the component
   */
  getDesignSet(componentName: string): DesignSet {
    const isInDesign = componentName && componentName in design.components
    return isInDesign ? design.components[componentName] : design.defaultSet
  }
}
