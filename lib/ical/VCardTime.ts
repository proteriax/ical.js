/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
* Portions Copyright (C) Philipp Kewisch, 2015 */

import { Time, TimeOptions } from './Time'
import { strictParseInt, pad2 } from './helpers'
import { Timezone } from './Timezone'
import { design } from './design'
import { UtcOffset } from './UTCOffset'

/**
 * Describes a vCard time, which has slight differences to the Time.
 * Properties can be null if not specified, for example for dates with
 * reduced accuracy or truncation.
 *
 * Note that currently not all methods are correctly re-implemented for
 * VCardTime. For example, comparison will have undefined results when some
 * members are null.
 *
 * Also, normalization is not yet implemented for this class!
 *
 * @param data The data for the time instance
 * @param zone The timezone to use
 * @param icaltype The type for this date/time object
 */
export class VCardTime extends Time {
  private _icaltype: string
  constructor(data: Partial<TimeOptions>, zone: Timezone, icaltype?: string) {
    super()
    const time = this._time = Object.create(null)

    time.year = null
    time.month = null
    time.day = null
    time.hour = null
    time.minute = null
    time.second = null

    this._icaltype = icaltype || 'date-and-or-time'

    this.fromData(data, zone)
  }

  /**
   * The type name, to be used in the jCal object.
   */
  get icaltype(): string {
    return this._icaltype
  }

  /**
   * The timezone. This can either be floating, UTC, or an instance of
   * UtcOffset.
   */
  zone: Timezone // | UtcOffset

  /**
   * Returns a clone of the vcard date/time object.
   *
   * @return The cloned object
   */
  clone(): VCardTime {
    return new VCardTime(this._time, this.zone, this.icaltype)
  }

  _normalize() {
    return this
  }

  /**
   * @inheritdoc
   */
  utcOffset() {
    if (this.zone instanceof UtcOffset) {
      return this.zone.toSeconds()
    } else {
      return Time.prototype.utcOffset.apply(this, arguments)
    }
  }

  /**
   * Returns an RFC 6350 compliant representation of this object.
   *
   * @return vcard date/time string
   */
  toICALString(): string {
    return design.vcard.value[this.icaltype].toICAL(this.toString())
  }

  /**
   * The string representation of this date/time, in jCard form
   * (including : and - separators).
   * @return {String}
   */
  toString(): string {
    const p2 = pad2
    const y = this.year, m = this.month, d = this.day
    const h = this.hour, mm = this.minute, s = this.second

    const hasYear = y !== null, hasMonth = m !== null, hasDay = d !== null
    const hasHour = h !== null, hasMinute = mm !== null, hasSecond = s !== null

    const datepart = (hasYear ? p2(y) + (hasMonth || hasDay ? '-' : '') : (hasMonth || hasDay ? '--' : '')) +
                    (hasMonth ? p2(m) : '') +
                    (hasDay ? '-' + p2(d) : '')
    const timepart = (hasHour ? p2(h) : '-') + (hasHour && hasMinute ? ':' : '') +
                    (hasMinute ? p2(mm) : '') + (!hasHour && !hasMinute ? '-' : '') +
                    (hasMinute && hasSecond ? ':' : '') +
                    (hasSecond ? p2(s) : '')

    let zone
    if (this.zone === Timezone.utcTimezone) {
      zone = 'Z'
    } else if (this.zone instanceof UtcOffset) {
      zone = this.zone.toString()
    } else if (this.zone === Timezone.localTimezone) {
      zone = ''
    } else if (this.zone instanceof Timezone) {
      const offset = UtcOffset.fromSeconds(this.zone.utcOffset(this))
      zone = offset.toString()
    } else {
      zone = ''
    }

    switch (this.icaltype) {
      case 'time':
        return timepart + zone
      case 'date-and-or-time':
      case 'date-time':
        return datepart + (timepart === '--' ? '' : 'T' + timepart + zone)
      case 'date':
        return datepart
    }
    return ''
  }

  /**
   * Returns a new VCardTime instance from a date and/or time string.
   *
   * @param aValue     The string to create from
   * @param aIcalType  The type for this instance, e.g. date-and-or-time
   * @return   The date/time instance
   */
  static fromDateAndOrTimeString(aValue: string, aIcalType?: string): VCardTime {
    function part(v, s, e) {
      return v ? strictParseInt(v.substr(s, e)) : undefined
    }
    const parts = aValue.split('T')
    const dt = parts[0], tmz = parts[1]
    const splitzone = tmz ? design.vcard.value.time._splitZone(tmz) : []
    let zone = splitzone[0]
    const tm = splitzone[1]

    const dtlen = dt ? dt.length : 0
    const tmlen = tm ? tm.length : 0

    const hasDashDate = dt && dt[0] === '-' && dt[1] === '-' || false
    const hasDashTime = tm && tm[0] === '-'

    const o = {
      year: hasDashDate ? undefined : part(dt, 0, 4),
      month: hasDashDate && (dtlen === 4 || dtlen === 7) ? part(dt, 2, 2) : dtlen === 7 ? part(dt, 5, 2) : dtlen === 10 ? part(dt, 5, 2) : undefined,
      day: dtlen === 5 ? part(dt, 3, 2) : dtlen === 7 && hasDashDate ? part(dt, 5, 2) : dtlen === 10 ? part(dt, 8, 2) : undefined,

      hour: hasDashTime ? undefined : part(tm, 0, 2),
      minute: hasDashTime && tmlen === 3 ? part(tm, 1, 2) : tmlen > 4 ? hasDashTime ? part(tm, 1, 2) : part(tm, 3, 2) : undefined,
      second: tmlen === 4 ? part(tm, 2, 2) : tmlen === 6 ? part(tm, 4, 2) : tmlen === 8 ? part(tm, 6, 2) : undefined
    }

    if (zone === 'Z') {
      zone = Timezone.utcTimezone
    } else if (zone && zone[3] === ':') {
      zone = UtcOffset.fromString(zone)
    } else {
      zone = null
    }

    return new VCardTime(o, zone, aIcalType)
  }
}
