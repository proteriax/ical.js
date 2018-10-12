/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */

import { clone, binsearchInsert } from './helpers'
import { Component } from './Component'
import { Time, TimeOptions } from './Time'
import { parse } from './parse'
import { memoize } from './memoize'

const OPTIONS = ['tzid', 'location', 'tznames', 'latitude', 'longitude']

interface TimezoneOptions {
  /**
   * If data is a simple object, then this member can be set to either a
   * string containing the component data, or an already parsed
   * ICAL.Component
   */
  component: string | Component

  /** The timezone identifier */
  tzid: string
  /** The timezone locationw */
  location: string
  /** An alternative string representation of the timezone */
  tznames: string
  /** The latitude of the timezone */
  latitude: number
  /** The longitude of the timezone */
  longitude: number
}

interface Change extends TimeOptions {
  utcOffset: number
  prevUtcOffset: number
  isDaylight: boolean
  isDate: boolean
}

/**
 * Timezone representation, created by passing in a tzid and component.
 */
export class Timezone {
  private changes: Change[]

  /**
   * @example
   *
   * var vcalendar;
   * var timezoneComp = vcalendar.getFirstSubcomponent('vtimezone');
   * var tzid = timezoneComp.getFirstPropertyValue('tzid');
   *
   * var timezone = new ICAL.Timezone({
   *   component: timezoneComp,
   *   tzid
   * });
   * @param data options for class
   */
  constructor(data?: Component | Partial<TimezoneOptions>) {
    data && this.fromData(data)
  }

  /**
   * Timezone identifier
   */
  tzid: string = ''

  /**
   * Timezone location
   */
  location: string = ''

  /**
   * Alternative timezone name, for the string representation
   */
  tznames: string = ''

  /**
   * The primary latitude for the timezone.
   */
  latitude: number = 0.0

  /**
   * The primary longitude for the timezone.
   */
  longitude: number = 0.0

  /**
   * The vtimezone component for this timezone.
   */
  component: Component

  /**
   * The year this timezone has been expanded to. All timezone transition
   * dates until this year are known and can be used for calculation
   */
  private expandedUntilYear = 0

  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param aData options for class
   */
  fromData(aData: Component | Partial<TimezoneOptions>) {
    this.expandedUntilYear = 0
    this.changes = []

    if (aData instanceof Component) {
      // Either a component is passed directly
      this.component = aData
    } else {
      // Otherwise the component may be in the data object
      if (aData && 'component' in aData) {
        if (typeof aData.component === 'string') {
          // If a string was passed, parse it as a component
          const jCal = parse(aData.component)
          this.component = new Component(jCal)
        } else if (aData.component instanceof Component) {
          // If it was a component already, then just set it
          this.component = aData.component
        } else {
          // Otherwise just null out the component
        }
      }

      // Copy remaining passed properties
      for (const key in OPTIONS) {
        /* istanbul ignore else */
        if (OPTIONS.hasOwnProperty(key)) {
          const prop = OPTIONS[key]
          if (aData && prop in aData) {
            this[prop] = aData[prop]
          }
        }
      }
    }

    // If we have a component but no TZID, attempt to get it from the
    // component's properties.
    if (this.component instanceof Component && !this.tzid) {
      this.tzid = this.component.getFirstPropertyValue('tzid')!
    }

    return this
  }

  /**
   * Finds the utcOffset the given time would occur in this timezone.
   *
   * @param tt The time to check for
   * @return utc offset in seconds
   */
  utcOffset(tt: Time): number {
    if (this === Timezone.utcTimezone || this === Timezone.localTimezone) {
      return 0
    }

    this._ensureCoverage(tt.year)

    if (!this.changes.length) {
      return 0
    }

    const tt_change = {
      year: tt.year,
      month: tt.month,
      day: tt.day,
      hour: tt.hour,
      minute: tt.minute,
      second: tt.second
    }

    let changeNum = this._findNearbyChange(tt_change)
    let change_num_to_use = -1
    let step = 1

    // TODO: replace with bin search?
    for (;;) {
      const change = clone(this.changes[changeNum], true)
      if (change.utcOffset < change.prevUtcOffset) {
        Timezone.adjustChange(change, 0, 0, 0, change.utcOffset)
      } else {
        Timezone.adjustChange(change, 0, 0, 0,
                                        change.prevUtcOffset)
      }

      const cmp = Timezone._compare_change_fn(tt_change, change)

      if (cmp >= 0) {
        change_num_to_use = changeNum
      } else {
        step = -1
      }

      if (step === -1 && change_num_to_use !== -1) {
        break
      }

      changeNum += step

      if (changeNum < 0) {
        return 0
      }

      if (changeNum >= this.changes.length) {
        break
      }
    }

    let zoneChange = this.changes[change_num_to_use]
    const utcOffset_change = zoneChange.utcOffset - zoneChange.prevUtcOffset

    if (utcOffset_change < 0 && change_num_to_use > 0) {
      const tmpChange = clone(zoneChange, true)
      Timezone.adjustChange(tmpChange, 0, 0, 0,
                                      tmpChange.prevUtcOffset)

      if (Timezone._compare_change_fn(tt_change, tmpChange) < 0) {
        const prevZoneChange = this.changes[change_num_to_use - 1]

        const wantDaylight = false // TODO

        if (zoneChange.isDaylight !== wantDaylight &&
            prevZoneChange.isDaylight === wantDaylight) {
          zoneChange = prevZoneChange
        }
      }
    }

    // TODO return is_daylight?
    return zoneChange.utcOffset
  }

  _findNearbyChange(change) {
    // find the closest match
    const idx = binsearchInsert(
      this.changes,
      change,
      Timezone._compare_change_fn
    )

    if (idx >= this.changes.length) {
      return this.changes.length - 1
    }

    return idx
  }

  _ensureCoverage(aYear) {
    if (Timezone._minimumExpansionYear === -1) {
      const today = Time.now()
      Timezone._minimumExpansionYear = today.year
    }

    let changesEndYear = aYear
    if (changesEndYear < Timezone._minimumExpansionYear) {
      changesEndYear = Timezone._minimumExpansionYear
    }

    changesEndYear += Timezone.EXTRA_COVERAGE

    if (changesEndYear > Timezone.MAX_YEAR) {
      changesEndYear = Timezone.MAX_YEAR
    }

    if (!this.changes.length || this.expandedUntilYear < aYear) {
      const subcomps = this.component.getAllSubcomponents()
      const compLen = subcomps.length
      let compIdx = 0

      for (; compIdx < compLen; compIdx++) {
        this._expandComponent(
          subcomps[compIdx], changesEndYear, this.changes
        )
      }

      this.changes.sort(Timezone._compare_change_fn)
      this.expandedUntilYear = changesEndYear
    }
  }

  _expandComponent(aComponent, aYear, changes) {
    if (!aComponent.hasProperty('dtstart') ||
        !aComponent.hasProperty('tzoffsetto') ||
        !aComponent.hasProperty('tzoffsetfrom')) {
      return null
    }

    const dtstart = aComponent.getFirstProperty('dtstart').getFirstValue()
    let change: Partial<Change> = {}

    function convert_tzoffset(offset) {
      return offset.factor * (offset.hours * 3600 + offset.minutes * 60)
    }

    function initChanges(): Partial<Change> {
      return {
        isDaylight: (aComponent.name === 'daylight'),
        utcOffset: convert_tzoffset(
          aComponent.getFirstProperty('tzoffsetto').getFirstValue()
        ),
        prevUtcOffset: convert_tzoffset(
          aComponent.getFirstProperty('tzoffsetfrom').getFirstValue()
        )
      }
    }

    if (!aComponent.hasProperty('rrule') && !aComponent.hasProperty('rdate')) {
      change = initChanges()
      change.year = dtstart.year
      change.month = dtstart.month
      change.day = dtstart.day
      change.hour = dtstart.hour
      change.minute = dtstart.minute
      change.second = dtstart.second

      Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset!)
      changes.push(change)
    } else {
      const props = aComponent.getAllProperties('rdate')
      for (const rdatekey in props) {
        /* istanbul ignore if */
        if (!props.hasOwnProperty(rdatekey)) {
          continue
        }
        const rdate = props[rdatekey]
        const time = rdate.getFirstValue()
        change = initChanges()

        change.year = time.year
        change.month = time.month
        change.day = time.day

        if (time.isDate) {
          change.hour = dtstart.hour
          change.minute = dtstart.minute
          change.second = dtstart.second

          if (dtstart.zone !== Timezone.utcTimezone) {
            Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset!)
          }
        } else {
          change.hour = time.hour
          change.minute = time.minute
          change.second = time.second

          if (time.zone !== Timezone.utcTimezone) {
            Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset!)
          }
        }

        changes.push(change)
      }

      let rrule = aComponent.getFirstProperty('rrule')

      if (rrule) {
        rrule = rrule.getFirstValue()
        change = initChanges()

        if (rrule.until && rrule.until.zone === Timezone.utcTimezone) {
          rrule.until.adjust(0, 0, 0, change.prevUtcOffset)
          rrule.until.zone = Timezone.localTimezone
        }

        const iterator = rrule.iterator(dtstart)

        let occ
        while ((occ = iterator.next())) {
          change = initChanges()
          if (occ.year > aYear || !occ) {
            break
          }

          change.year = occ.year
          change.month = occ.month
          change.day = occ.day
          change.hour = occ.hour
          change.minute = occ.minute
          change.second = occ.second
          change.isDate = occ.isDate

          Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset!)
          changes.push(change)
        }
      }
    }

    return changes
  }

  /**
   * The string representation of this timezone.
   * @return {String}
   */
  toString() {
    return (this.tznames ? this.tznames : this.tzid)
  }


  static _compare_change_fn(a, b) {
    if (a.year < b.year) return -1
    else if (a.year > b.year) return 1

    if (a.month < b.month) return -1
    else if (a.month > b.month) return 1

    if (a.day < b.day) return -1
    else if (a.day > b.day) return 1

    if (a.hour < b.hour) return -1
    else if (a.hour > b.hour) return 1

    if (a.minute < b.minute) return -1
    else if (a.minute > b.minute) return 1

    if (a.second < b.second) return -1
    else if (a.second > b.second) return 1

    return 0
  }

  /**
   * Convert the date/time from one zone to the next.
   *
   * @param tt                  The time to convert
   * @param from_zone       The source zone to convert from
   * @param to_zone         The target zone to conver to
   * @return The converted date/time object
   */
  static convert_time(tt: Time, from_zone: Timezone, to_zone: Timezone): Time | null {
    if (tt.isDate ||
        from_zone.tzid === to_zone.tzid ||
        from_zone === Timezone.localTimezone ||
        to_zone === Timezone.localTimezone) {
      tt.zone = to_zone
      return tt
    }

    let utcOffset = from_zone.utcOffset(tt)
    tt.adjust(0, 0, 0, - utcOffset)

    utcOffset = to_zone.utcOffset(tt)
    tt.adjust(0, 0, 0, utcOffset)

    return null
  }

  /**
   * Creates a new Timezone instance from the passed data object.
   *
   * @param aData options for class
   */
  static fromData(aData: Partial<TimezoneOptions>) {
    const tt = new Timezone()
    return tt.fromData(aData)
  }

  /**
   * The instance describing the UTC timezone
   */
  @memoize
  static get utcTimezone(): Timezone { return Timezone.fromData({ tzid: 'UTC' }) }

  /**
   * The instance describing the local timezone
   */
  @memoize
  static get localTimezone(): Timezone { return Timezone.fromData({ tzid: 'floating' }) }

  /**
   * Adjust a timezone change object.
   * @private
   * @param change   The timezone change object
   * @param days     The extra amount of days
   * @param hours    The extra amount of hours
   * @param minutes  The extra amount of minutes
   * @param seconds  The extra amount of seconds
   */
  private static adjustChange(change: object, days: number, hours: number, minutes: number, seconds: number) {
    return Time.prototype.adjust.call(
      change,
      days,
      hours,
      minutes,
      seconds,
      change
    )
  }

  static _minimumExpansionYear = -1
  static MAX_YEAR = 2035 // TODO this is because of time_t, which we don't need. Still usefull?
  static EXTRA_COVERAGE = 5
}
