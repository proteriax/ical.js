/* eslint-disable */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var events = require('events');

class Binary {
  constructor(aValue) {
    this.icaltype = 'binary';
    this.value = aValue || null;
  }

  decodeValue() {
    return this._b64_decode(this.value);
  }

  setEncodedValue(aValue) {
    this.value = this._b64_encode(aValue);
  }

  _b64_encode(data) {
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let i = 0,
        ac = 0,
        enc = '';
    const tmp_arr = [];

    if (!data) {
      return data;
    }

    do {
      const o1 = data.charCodeAt(i++);
      const o2 = data.charCodeAt(i++);
      const o3 = data.charCodeAt(i++);
      const bits = o1 << 16 | o2 << 8 | o3;
      const h1 = bits >> 18 & 0x3f;
      const h2 = bits >> 12 & 0x3f;
      const h3 = bits >> 6 & 0x3f;
      const h4 = bits & 0x3f;
      tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');
    const r = data.length % 3;
    return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
  }

  _b64_decode(data) {
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz0123456789+/=';
    let i = 0,
        ac = 0,
        dec = '';
    const tmp_arr = [];

    if (!data) {
      return data;
    }

    data += '';

    do {
      const h1 = b64.indexOf(data.charAt(i++));
      const h2 = b64.indexOf(data.charAt(i++));
      const h3 = b64.indexOf(data.charAt(i++));
      const h4 = b64.indexOf(data.charAt(i++));
      const bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
      const o1 = bits >> 16 & 0xff;
      const o2 = bits >> 8 & 0xff;
      const o3 = bits & 0xff;

      if (h3 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1);
      } else if (h4 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1, o2);
      } else {
        tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
      }
    } while (i < data.length);

    dec = tmp_arr.join('');
    return dec;
  }

  toString() {
    return this.value || '';
  }

  static fromString(aString) {
    return new Binary(aString);
  }

}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

const identity = v => v;

const constant = v => () => v;

function memoize(_, key, desc) {
  const {
    get,
    value
  } = desc;

  const createCallback = (func, toPropVal) => function () {
    const value = func.call(this);
    Object.defineProperty(this, key, {
      value: toPropVal(value),
      enumerable: desc.enumerable,
      configurable: desc.configurable
    });
    return value;
  };

  if (get) {
    desc.get = createCallback(get, identity);
  } else if (typeof value === 'function') {
    desc.value = createCallback(value, constant);
  } else {
    throw new TypeError('Cannot memoize a property that has neither getter or value function.');
  }
}

exports.WeekDay = {
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
  SATURDAY: 7
};
class Time {
  constructor(data, zone) {
    this._time = Object.create(null);
    this.year = 0;
    this.month = 1;
    this.day = 1;
    this.hour = 0;
    this.minute = 0;
    this.second = 0;
    this.isDate = false;
    this._cachedUnixTime = 0;
    this._pendingNormalization = false;
    this.fromData(data, zone);
  }

  get icaltype() {
    return this.isDate ? 'date' : 'date-time';
  }

  clone() {
    return new Time(this._time, this.zone);
  }

  reset() {
    this.fromData(Time.epochTime);
    this.zone = Timezone.utcTimezone;
  }

  resetTo(year, month, day, hour, minute, second, timezone) {
    this.fromData({
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: second,
      timezone: timezone
    });
  }

  fromJSDate(aDate, useUTC) {
    if (!aDate) {
      this.reset();
    } else {
      if (useUTC) {
        this.zone = Timezone.utcTimezone;
        this.year = aDate.getUTCFullYear();
        this.month = aDate.getUTCMonth() + 1;
        this.day = aDate.getUTCDate();
        this.hour = aDate.getUTCHours();
        this.minute = aDate.getUTCMinutes();
        this.second = aDate.getUTCSeconds();
      } else {
        this.zone = Timezone.localTimezone;
        this.year = aDate.getFullYear();
        this.month = aDate.getMonth() + 1;
        this.day = aDate.getDate();
        this.hour = aDate.getHours();
        this.minute = aDate.getMinutes();
        this.second = aDate.getSeconds();
      }
    }

    this._cachedUnixTime = undefined;
    return this;
  }

  fromData(aData, aZone) {
    if (aData) {
      for (const key in aData) {
        if (Object.prototype.hasOwnProperty.call(aData, key)) {
          if (key === 'icaltype') continue;
          this[key] = aData[key];
        }
      }
    }

    if (aZone) {
      this.zone = aZone;
    }

    if (aData) {
      if ('isDate' in aData) {
        this.isDate = aData.isDate;
      } else {
        this.isDate = !('hour' in aData);
      }

      if ('timezone' in aData) {
        let zone = aData.timezone;

        if (typeof zone === 'string') {
          zone = get(zone);
        }

        this.zone = zone || Timezone.localTimezone;
      }
    }

    if (!this.zone) {
      this.zone = Timezone.localTimezone;
    }

    this._cachedUnixTime = undefined;
    return this;
  }

  dayOfWeek() {
    const dowCacheKey = (this.year << 9) + (this.month << 5) + this.day;

    if (dowCacheKey in Time._dowCache) {
      return Time._dowCache[dowCacheKey];
    }

    const q = this.day;
    const m = this.month + (this.month < 3 ? 12 : 0);
    const Y = this.year - (this.month < 3 ? 1 : 0);
    let h = q + Y + trunc((m + 1) * 26 / 10) + trunc(Y / 4);

    {
        h += trunc(Y / 100) * 6 + trunc(Y / 400);
      }

    h = (h + 6) % 7 + 1;
    Time._dowCache[dowCacheKey] = h;
    return h;
  }

  dayOfYear() {
    const is_leap = Time.isLeapYear(this.year) ? 1 : 0;
    const diypm = Time.daysInYearPassedMonth;
    return diypm[is_leap][this.month - 1] + this.day;
  }

  startOfWeek(aWeekStart) {
    const firstDow = aWeekStart || Time.SUNDAY;
    const result = this.clone();
    result.day -= (this.dayOfWeek() + 7 - firstDow) % 7;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }

  endOfWeek(aWeekStart) {
    const firstDow = aWeekStart || Time.SUNDAY;
    const result = this.clone();
    result.day += (7 - this.dayOfWeek() + firstDow - Time.SUNDAY) % 7;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }

  startOfMonth() {
    const result = this.clone();
    result.day = 1;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }

  endOfMonth() {
    const result = this.clone();
    result.day = Time.daysInMonth(result.month, result.year);
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }

  startOfYear() {
    const result = this.clone();
    result.day = 1;
    result.month = 1;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }

  endOfYear() {
    const result = this.clone();
    result.day = 31;
    result.month = 12;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }

  startDoyWeek(aFirstDayOfWeek) {
    const firstDow = aFirstDayOfWeek || Time.SUNDAY;
    let delta = this.dayOfWeek() - firstDow;
    if (delta < 0) delta += 7;
    return this.dayOfYear() - delta;
  }

  getDominicalLetter() {
    return Time.getDominicalLetter(this.year);
  }

  nthWeekDay(aDayOfWeek, aPos) {
    const daysInMonth = Time.daysInMonth(this.month, this.year);
    let weekday;
    let pos = aPos;
    let start = 0;
    const otherDay = this.clone();

    if (pos >= 0) {
      otherDay.day = 1;

      if (pos !== 0) {
        pos--;
      }

      start = otherDay.day;
      const startDow = otherDay.dayOfWeek();
      let offset = aDayOfWeek - startDow;
      if (offset < 0) offset += 7;
      start += offset;
      start -= aDayOfWeek;
      weekday = aDayOfWeek;
    } else {
      otherDay.day = daysInMonth;
      const endDow = otherDay.dayOfWeek();
      pos++;
      weekday = endDow - aDayOfWeek;

      if (weekday < 0) {
        weekday += 7;
      }

      weekday = daysInMonth - weekday;
    }

    weekday += pos * 7;
    return start + weekday;
  }

  isNthWeekDay(aDayOfWeek, aPos) {
    const dow = this.dayOfWeek();

    if (aPos === 0 && dow === aDayOfWeek) {
      return true;
    }

    const day = this.nthWeekDay(aDayOfWeek, aPos);

    if (day === this.day) {
      return true;
    }

    return false;
  }

  weekNumber(aWeekStart) {
    const wnCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + aWeekStart;

    if (wnCacheKey in Time._wnCache) {
      return Time._wnCache[wnCacheKey];
    }

    let week1;
    const dt = this.clone();
    dt.isDate = true;
    let isoyear = this.year;

    if (dt.month === 12 && dt.day > 25) {
      week1 = Time.weekOneStarts(isoyear + 1, aWeekStart);

      if (dt.compare(week1) < 0) {
        week1 = Time.weekOneStarts(isoyear, aWeekStart);
      } else {
        isoyear++;
      }
    } else {
      week1 = Time.weekOneStarts(isoyear, aWeekStart);

      if (dt.compare(week1) < 0) {
        week1 = Time.weekOneStarts(--isoyear, aWeekStart);
      }
    }

    const daysBetween = dt.subtractDate(week1).toSeconds() / 86400;
    const answer = trunc(daysBetween / 7) + 1;
    Time._wnCache[wnCacheKey] = answer;
    return answer;
  }

  addDuration(aDuration) {
    const mult = aDuration.isNegative ? -1 : 1;
    let second = this.second;
    let minute = this.minute;
    let hour = this.hour;
    let day = this.day;
    second += mult * aDuration.seconds;
    minute += mult * aDuration.minutes;
    hour += mult * aDuration.hours;
    day += mult * aDuration.days;
    day += mult * 7 * aDuration.weeks;
    this.second = second;
    this.minute = minute;
    this.hour = hour;
    this.day = day;
    this._cachedUnixTime = undefined;
  }

  subtractDate(aDate) {
    const unixTime = this.toUnixTime() + this.utcOffset();
    const other = aDate.toUnixTime() + aDate.utcOffset();
    return Duration.fromSeconds(unixTime - other);
  }

  subtractDateTz(aDate) {
    const unixTime = this.toUnixTime();
    const other = aDate.toUnixTime();
    return Duration.fromSeconds(unixTime - other);
  }

  compare(other) {
    const a = this.toUnixTime();
    const b = other.toUnixTime();
    if (a > b) return 1;
    if (b > a) return -1;
    return 0;
  }

  compareDateOnlyTz(other, tz) {
    function cmp(attr) {
      return Time._cmp_attr(a, b, attr);
    }

    const a = this.convertToZone(tz);
    const b = other.convertToZone(tz);
    let rc = 0;
    if ((rc = cmp('year')) !== 0) return rc;
    if ((rc = cmp('month')) !== 0) return rc;
    if ((rc = cmp('day')) !== 0) return rc;
    return rc;
  }

  convertToZone(zone) {
    const copy = this.clone();
    const zoneEquals = this.zone.tzid === zone.tzid;

    if (!this.isDate && !zoneEquals) {
      Timezone.convert_time(copy, this.zone, zone);
    }

    copy.zone = zone;
    return copy;
  }

  utcOffset() {
    if (this.zone === Timezone.localTimezone || this.zone === Timezone.utcTimezone) {
      return 0;
    } else {
      return this.zone.utcOffset(this);
    }
  }

  toICALString() {
    const string = this.toString();

    if (string.length > 10) {
      return design.icalendar.value['date-time'].toICAL(string);
    } else {
      return design.icalendar.value.date.toICAL(string);
    }
  }

  toString() {
    let result = this.year + '-' + pad2(this.month) + '-' + pad2(this.day);

    if (!this.isDate) {
      result += 'T' + pad2(this.hour) + ':' + pad2(this.minute) + ':' + pad2(this.second);

      if (this.zone === Timezone.utcTimezone) {
        result += 'Z';
      }
    }

    return result;
  }

  toJSDate() {
    if (this.zone === Timezone.localTimezone) {
      if (this.isDate) {
        return new Date(this.year, this.month - 1, this.day);
      } else {
        return new Date(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, 0);
      }
    } else {
      return new Date(this.toUnixTime() * 1000);
    }
  }

  _normalize() {
    if (this._time.isDate) {
      this._time.hour = 0;
      this._time.minute = 0;
      this._time.second = 0;
    }

    this.adjust(0, 0, 0, 0);
    return this;
  }

  adjust(aExtraDays, aExtraHours, aExtraMinutes, aExtraSeconds, aTime = this._time) {
    let daysOverflow = 0,
        yearsOverflow = 0;
    const time = aTime || this._time;

    if (!time.isDate) {
      const second = time.second + aExtraSeconds;
      time.second = second % 60;
      let minutesOverflow = trunc(second / 60);

      if (time.second < 0) {
        time.second += 60;
        minutesOverflow--;
      }

      const minute = time.minute + aExtraMinutes + minutesOverflow;
      time.minute = minute % 60;
      let hoursOverflow = trunc(minute / 60);

      if (time.minute < 0) {
        time.minute += 60;
        hoursOverflow--;
      }

      const hour = time.hour + aExtraHours + hoursOverflow;
      time.hour = hour % 24;
      daysOverflow = trunc(hour / 24);

      if (time.hour < 0) {
        time.hour += 24;
        daysOverflow--;
      }
    }

    if (time.month > 12) {
      yearsOverflow = trunc((time.month - 1) / 12);
    } else if (time.month < 1) {
      yearsOverflow = trunc(time.month / 12) - 1;
    }

    time.year += yearsOverflow;
    time.month -= 12 * yearsOverflow;
    let day = time.day + aExtraDays + daysOverflow;

    if (day > 0) {
      while (true) {
        const daysInMonth = Time.daysInMonth(time.month, time.year);

        if (day <= daysInMonth) {
          break;
        }

        time.month++;

        if (time.month > 12) {
          time.year++;
          time.month = 1;
        }

        day -= daysInMonth;
      }
    } else {
      while (day <= 0) {
        if (time.month === 1) {
          time.year--;
          time.month = 12;
        } else {
          time.month--;
        }

        day += Time.daysInMonth(time.month, time.year);
      }
    }

    time.day = day;
    this._cachedUnixTime = undefined;
    return this;
  }

  fromUnixTime(seconds) {
    this.zone = Timezone.utcTimezone;
    const epoch = Time.epochTime.clone();
    epoch.adjust(0, 0, 0, seconds);
    this.year = epoch.year;
    this.month = epoch.month;
    this.day = epoch.day;
    this.hour = epoch.hour;
    this.minute = epoch.minute;
    this.second = Math.floor(epoch.second);
    this._cachedUnixTime = undefined;
  }

  toUnixTime() {
    if (this._cachedUnixTime != null) {
      return this._cachedUnixTime;
    }

    const offset = this.utcOffset();
    const ms = Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second - offset);
    this._cachedUnixTime = ms / 1000;
    return this._cachedUnixTime;
  }

  toJSON() {
    const copy = ['year', 'month', 'day', 'hour', 'minute', 'second', 'isDate'];
    const result = Object.create(null);
    let i = 0;
    const len = copy.length;
    let prop;

    for (; i < len; i++) {
      prop = copy[i];
      result[prop] = this[prop];
    }

    if (this.zone) {
      result.timezone = this.zone.tzid;
    }

    return result;
  }

  static daysInMonth(month, year) {
    const _daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let days = 30;
    if (month < 1 || month > 12) return days;
    days = _daysInMonth[month];

    if (month === 2) {
      days += Time.isLeapYear(year) ? 1 : 0;
    }

    return days;
  }

  static isLeapYear(year) {
    if (year <= 1752) {
      return year % 4 === 0;
    } else {
      return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    }
  }

  static fromDayOfYear(aDayOfYear, aYear) {
    let year = aYear;
    let doy = aDayOfYear;
    const tt = new Time();
    let isLeap = Time.isLeapYear(year) ? 1 : 0;

    if (doy < 1) {
      year--;
      isLeap = Time.isLeapYear(year) ? 1 : 0;
      doy += Time.daysInYearPassedMonth[isLeap][12];
      return Time.fromDayOfYear(doy, year);
    } else if (doy > Time.daysInYearPassedMonth[isLeap][12]) {
      isLeap = Time.isLeapYear(year) ? 1 : 0;
      doy -= Time.daysInYearPassedMonth[isLeap][12];
      year++;
      return Time.fromDayOfYear(doy, year);
    }

    tt.year = year;
    tt.isDate = true;

    for (let month = 11; month >= 0; month--) {
      if (doy > Time.daysInYearPassedMonth[isLeap][month]) {
        tt.month = month + 1;
        tt.day = doy - Time.daysInYearPassedMonth[isLeap][month];
        break;
      }
    }

    return tt;
  }

  static fromStringv2(str) {
    return new Time({
      year: parseInt(str.substr(0, 4), 10),
      month: parseInt(str.substr(5, 2), 10),
      day: parseInt(str.substr(8, 2), 10),
      isDate: true
    });
  }

  static fromDateString(aValue) {
    return new Time({
      year: strictParseInt(aValue.substr(0, 4)),
      month: strictParseInt(aValue.substr(5, 2)),
      day: strictParseInt(aValue.substr(8, 2)),
      isDate: true
    });
  }

  static fromDateTimeString(aValue, prop) {
    if (aValue.length < 19) {
      throw new Error('invalid date-time value: "' + aValue + '"');
    }

    let zone;

    if (aValue[19] && aValue[19] === 'Z') {
      zone = 'Z';
    } else if (prop) {
      zone = prop.getParameter('tzid');
    }

    const time = new Time({
      year: strictParseInt(aValue.substr(0, 4)),
      month: strictParseInt(aValue.substr(5, 2)),
      day: strictParseInt(aValue.substr(8, 2)),
      hour: strictParseInt(aValue.substr(11, 2)),
      minute: strictParseInt(aValue.substr(14, 2)),
      second: strictParseInt(aValue.substr(17, 2)),
      timezone: zone
    });
    return time;
  }

  static fromString(aValue) {
    if (aValue.length > 10) {
      return Time.fromDateTimeString(aValue);
    } else {
      return Time.fromDateString(aValue);
    }
  }

  static fromJSDate(aDate, useUTC) {
    const tt = new Time();
    return tt.fromJSDate(aDate, useUTC);
  }

  static fromData(aData, aZone) {
    const t = new Time();
    return t.fromData(aData, aZone);
  }

  static now() {
    return Time.fromJSDate(new Date(), false);
  }

  static weekOneStarts(aYear, aWeekStart) {
    const t = Time.fromData({
      year: aYear,
      month: 1,
      day: 1,
      isDate: true
    });
    const dow = t.dayOfWeek();
    const wkst = aWeekStart || Time.DEFAULT_WEEK_START;

    if (dow > Time.THURSDAY) {
      t.day += 7;
    }

    if (wkst > Time.THURSDAY) {
      t.day -= 7;
    }

    t.day -= dow - wkst;
    return t;
  }

  static getDominicalLetter(yr) {
    const LTRS = 'GFEDCBA';
    const dom = (yr + (yr / 4 | 0) + (yr / 400 | 0) - (yr / 100 | 0) - 1) % 7;
    const isLeap = Time.isLeapYear(yr);

    if (isLeap) {
      return LTRS[(dom + 6) % 7] + LTRS[dom];
    } else {
      return LTRS[dom];
    }
  }

  static get epochTime() {
    return Time.fromData({
      year: 1970,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      isDate: false,
      timezone: 'Z'
    });
  }

  static _cmp_attr(a, b, attr) {
    if (a[attr] > b[attr]) return 1;
    if (a[attr] < b[attr]) return -1;
    return 0;
  }

}
Time._dowCache = {};
Time._wnCache = {};
Time.daysInYearPassedMonth = [[0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365], [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366]];
Time.SUNDAY = exports.WeekDay.SUNDAY;
Time.MONDAY = exports.WeekDay.MONDAY;
Time.TUESDAY = exports.WeekDay.TUESDAY;
Time.WEDNESDAY = exports.WeekDay.WEDNESDAY;
Time.THURSDAY = exports.WeekDay.THURSDAY;
Time.FRIDAY = exports.WeekDay.FRIDAY;
Time.SATURDAY = exports.WeekDay.SATURDAY;
Time.DEFAULT_WEEK_START = Time.MONDAY;

__decorate([memoize], Time, "epochTime", null);

(function setupNormalizeAttributes() {
  function defineAttr(attr) {
    Object.defineProperty(Time.prototype, attr, {
      get() {
        if (this._pendingNormalization) {
          this._normalize();

          this._pendingNormalization = false;
        }

        return this._time[attr];
      },

      set(val) {
        if (attr === 'isDate' && val && !this._time.isDate) {
          this.adjust(0, 0, 0, 0);
        }

        this._cachedUnixTime = undefined;
        this._pendingNormalization = true;
        this._time[attr] = val;
        return val;
      }

    });
  }

  defineAttr('year');
  defineAttr('month');
  defineAttr('day');
  defineAttr('hour');
  defineAttr('minute');
  defineAttr('second');
  defineAttr('isDate');
})();

const CHAR = /[^ \t]/;
const VALUE_DELIMITER = ':';
const PARAM_DELIMITER = ';';
const PARAM_NAME_DELIMITER = '=';
const DEFAULT_VALUE_TYPE = 'unknown';
const DEFAULT_PARAM_TYPE = 'text';

class ParserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParserError';

    try {
      throw new Error();
    } catch (e) {
      if (e.stack) {
        const split = e.stack.split('\n');
        split.shift();
        this.stack = split.join('\n');
      }
    }
  }

}

function parse(input) {
  const state = {
    component: [],
    stack: []
  };
  const root = state.component;
  state.stack = [root];

  parse._eachLine(input, function (err, line) {
    parse._handleContentLine(line, state);
  });

  if (state.stack.length > 1) {
    throw new ParserError('invalid ical body. component began but did not end');
  }

  return root.length === 1 ? root[0] : root;
}

parse.property = function (str, designSet) {
  const state = {
    component: [[], []],
    designSet: designSet || design.defaultSet
  };

  parse._handleContentLine(str, state);

  return state.component[1][0];
};

parse.component = function (str) {
  return parse(str);
};

parse.ParserError = ParserError;

parse._handleContentLine = function (line, state) {
  const valuePos = line.indexOf(VALUE_DELIMITER);
  let paramPos = line.indexOf(PARAM_DELIMITER);
  let lastParamIndex;
  let lastValuePos;
  let name;
  let value;
  let params = {};

  if (paramPos !== -1 && valuePos !== -1) {
    if (paramPos > valuePos) {
      paramPos = -1;
    }
  }

  let parsedParams;

  if (paramPos !== -1) {
    name = line.substring(0, paramPos).toLowerCase();
    parsedParams = parse._parseParameters(line.substring(paramPos), 0, state.designSet);

    if (parsedParams[2] === -1) {
      throw new ParserError("Invalid parameters in '" + line + "'");
    }

    params = parsedParams[0];
    lastParamIndex = parsedParams[1].length + parsedParams[2] + paramPos;

    if ((lastValuePos = line.substring(lastParamIndex).indexOf(VALUE_DELIMITER)) !== -1) {
      value = line.substring(lastParamIndex + lastValuePos + 1);
    } else {
      throw new ParserError("Missing parameter value in '" + line + "'");
    }
  } else if (valuePos !== -1) {
    name = line.substring(0, valuePos).toLowerCase();
    value = line.substring(valuePos + 1);

    if (name === 'begin') {
      const newComponent = [value.toLowerCase(), [], []];

      if (state.stack.length === 1) {
        state.component.push(newComponent);
      } else {
        state.component[2].push(newComponent);
      }

      state.stack.push(state.component);
      state.component = newComponent;

      if (!state.designSet) {
        state.designSet = design.getDesignSet(state.component[0]);
      }

      return;
    } else if (name === 'end') {
      state.component = state.stack.pop();
      return;
    }
  } else {
    throw new ParserError('invalid line (no token ";" or ":") "' + line + '"');
  }

  let valueType;
  let multiValue;
  let structuredValue;
  let propertyDetails;

  if (name in state.designSet.property) {
    propertyDetails = state.designSet.property[name];

    if ('multiValue' in propertyDetails) {
      multiValue = propertyDetails.multiValue;
    }

    if ('structuredValue' in propertyDetails) {
      structuredValue = propertyDetails.structuredValue;
    }

    if (value && 'detectType' in propertyDetails) {
      valueType = propertyDetails.detectType(value);
    }
  }

  if (!valueType) {
    if (!('value' in params)) {
      if (propertyDetails) {
        valueType = propertyDetails.defaultType;
      } else {
        valueType = DEFAULT_VALUE_TYPE;
      }
    } else {
      valueType = params.value.toLowerCase();
    }
  }

  delete params.value;
  let result;

  if (multiValue && structuredValue) {
    value = parse._parseMultiValue(value, structuredValue, valueType, [], multiValue, state.designSet, structuredValue);
    result = [name, params, valueType, value];
  } else if (multiValue) {
    result = [name, params, valueType];

    parse._parseMultiValue(value, multiValue, valueType, result, null, state.designSet, false);
  } else if (structuredValue) {
    value = parse._parseMultiValue(value, structuredValue, valueType, [], null, state.designSet, structuredValue);
    result = [name, params, valueType, value];
  } else {
    value = parse._parseValue(value, valueType, state.designSet, false);
    result = [name, params, valueType, value];
  }

  if (state.component[0] === 'vcard' && state.component[1].length === 0 && !(name === 'version' && value === '4.0')) {
    state.designSet = design.getDesignSet('vcard3');
  }

  state.component[1].push(result);
};

parse._parseValue = function (value, type, designSet, structuredValue) {
  if (type in designSet.value && 'fromICAL' in designSet.value[type]) {
    return designSet.value[type].fromICAL(value, structuredValue);
  }

  return value;
};

parse._parseParameters = function (line, start, designSet) {
  let lastParam = start;
  let pos = 0;
  const delim = PARAM_NAME_DELIMITER;
  const result = {};
  let name, lcname;
  let value,
      valuePos = -1;
  let type, multiValue, mvdelim;

  while (pos !== false && (pos = unescapedIndexOf(line, delim, pos + 1)) !== -1) {
    name = line.substr(lastParam + 1, pos - lastParam - 1);

    if (name.length === 0) {
      throw new ParserError("Empty parameter name in '" + line + "'");
    }

    lcname = name.toLowerCase();

    if (lcname in designSet.param && designSet.param[lcname].valueType) {
      type = designSet.param[lcname].valueType;
    } else {
      type = DEFAULT_PARAM_TYPE;
    }

    if (lcname in designSet.param) {
      multiValue = designSet.param[lcname].multiValue;

      if (designSet.param[lcname].multiValueSeparateDQuote) {
        mvdelim = parse._rfc6868Escape('"' + multiValue + '"');
      }
    }

    const nextChar = line[pos + 1];

    if (nextChar === '"') {
      valuePos = pos + 2;
      pos = unescapedIndexOf(line, '"', valuePos);

      if (multiValue && pos !== -1) {
        let extendedValue = true;

        while (extendedValue) {
          if (line[pos + 1] === multiValue && line[pos + 2] === '"') {
            pos = unescapedIndexOf(line, '"', pos + 3);
          } else {
            extendedValue = false;
          }
        }
      }

      if (pos === -1) {
        throw new ParserError('invalid line (no matching double quote) "' + line + '"');
      }

      value = line.substr(valuePos, pos - valuePos);
      lastParam = unescapedIndexOf(line, PARAM_DELIMITER, pos);

      if (lastParam === -1) {
        pos = false;
      }
    } else {
      valuePos = pos + 1;
      let nextPos = unescapedIndexOf(line, PARAM_DELIMITER, valuePos);
      const propValuePos = unescapedIndexOf(line, VALUE_DELIMITER, valuePos);

      if (propValuePos !== -1 && nextPos > propValuePos) {
        nextPos = propValuePos;
        pos = false;
      } else if (nextPos === -1) {
        if (propValuePos === -1) {
          nextPos = line.length;
        } else {
          nextPos = propValuePos;
        }

        pos = false;
      } else {
        lastParam = nextPos;
        pos = nextPos;
      }

      value = line.substr(valuePos, nextPos - valuePos);
    }

    value = parse._rfc6868Escape(value);

    if (multiValue) {
      const delimiter = mvdelim || multiValue;
      result[lcname] = parse._parseMultiValue(value, delimiter, type, [], null, designSet);
    } else {
      result[lcname] = parse._parseValue(value, type, designSet);
    }
  }

  return [result, value, valuePos];
};

parse._rfc6868Escape = function (val) {
  return val.replace(/\^['n^]/g, function (x) {
    return RFC6868_REPLACE_MAP[x];
  });
};

const RFC6868_REPLACE_MAP = {
  "^'": '"',
  '^n': '\n',
  '^^': '^'
};

parse._parseMultiValue = function (buffer, delim, type, result, innerMulti, designSet, structuredValue) {
  let pos = 0;
  let lastPos = 0;
  let value;

  if (delim.length === 0) {
    return buffer;
  }

  while ((pos = unescapedIndexOf(buffer, delim, lastPos)) !== -1) {
    value = buffer.substr(lastPos, pos - lastPos);

    if (innerMulti) {
      value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
    } else {
      value = parse._parseValue(value, type, designSet, structuredValue);
    }

    result.push(value);
    lastPos = pos + delim.length;
  }

  value = buffer.substr(lastPos);

  if (innerMulti) {
    value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
  } else {
    value = parse._parseValue(value, type, designSet, structuredValue);
  }

  result.push(value);
  return result.length === 1 ? result[0] : result;
};

parse._eachLine = function (buffer, callback) {
  const len = buffer.length;
  let lastPos = buffer.search(CHAR);
  let pos = lastPos;
  let line;
  let firstChar;
  let newlineOffset;

  do {
    pos = buffer.indexOf('\n', lastPos) + 1;

    if (pos > 1 && buffer[pos - 2] === '\r') {
      newlineOffset = 2;
    } else {
      newlineOffset = 1;
    }

    if (pos === 0) {
      pos = len;
      newlineOffset = 0;
    }

    firstChar = buffer[lastPos];

    if (firstChar === ' ' || firstChar === '\t') {
      line += buffer.substr(lastPos + 1, pos - lastPos - (newlineOffset + 1));
    } else {
      if (line) callback(null, line);
      line = buffer.substr(lastPos, pos - lastPos - newlineOffset);
    }

    lastPos = pos;
  } while (pos !== len);

  line = line.trim();
  if (line.length) callback(null, line);
};

const OPTIONS = ['tzid', 'location', 'tznames', 'latitude', 'longitude'];
class Timezone {
  constructor(data) {
    this.tzid = '';
    this.location = '';
    this.tznames = '';
    this.latitude = 0.0;
    this.longitude = 0.0;
    this.expandedUntilYear = 0;
    data && this.fromData(data);
  }

  fromData(aData) {
    this.expandedUntilYear = 0;
    this.changes = [];

    if (aData instanceof Component) {
      this.component = aData;
    } else {
      if (aData && 'component' in aData) {
        if (typeof aData.component === 'string') {
          const jCal = parse(aData.component);
          this.component = new Component(jCal);
        } else if (aData.component instanceof Component) {
          this.component = aData.component;
        }
      }

      for (const key in OPTIONS) {
        if (OPTIONS.hasOwnProperty(key)) {
          const prop = OPTIONS[key];

          if (aData && prop in aData) {
            this[prop] = aData[prop];
          }
        }
      }
    }

    if (this.component instanceof Component && !this.tzid) {
      this.tzid = this.component.getFirstPropertyValue('tzid');
    }

    return this;
  }

  utcOffset(tt) {
    if (this === Timezone.utcTimezone || this === Timezone.localTimezone) {
      return 0;
    }

    this._ensureCoverage(tt.year);

    if (!this.changes.length) {
      return 0;
    }

    const tt_change = {
      year: tt.year,
      month: tt.month,
      day: tt.day,
      hour: tt.hour,
      minute: tt.minute,
      second: tt.second
    };

    let changeNum = this._findNearbyChange(tt_change);

    let change_num_to_use = -1;
    let step = 1;

    for (;;) {
      const change = clone(this.changes[changeNum], true);

      if (change.utcOffset < change.prevUtcOffset) {
        Timezone.adjustChange(change, 0, 0, 0, change.utcOffset);
      } else {
        Timezone.adjustChange(change, 0, 0, 0, change.prevUtcOffset);
      }

      const cmp = Timezone._compare_change_fn(tt_change, change);

      if (cmp >= 0) {
        change_num_to_use = changeNum;
      } else {
        step = -1;
      }

      if (step === -1 && change_num_to_use !== -1) {
        break;
      }

      changeNum += step;

      if (changeNum < 0) {
        return 0;
      }

      if (changeNum >= this.changes.length) {
        break;
      }
    }

    let zoneChange = this.changes[change_num_to_use];
    const utcOffset_change = zoneChange.utcOffset - zoneChange.prevUtcOffset;

    if (utcOffset_change < 0 && change_num_to_use > 0) {
      const tmpChange = clone(zoneChange, true);
      Timezone.adjustChange(tmpChange, 0, 0, 0, tmpChange.prevUtcOffset);

      if (Timezone._compare_change_fn(tt_change, tmpChange) < 0) {
        const prevZoneChange = this.changes[change_num_to_use - 1];
        const wantDaylight = false;

        if (zoneChange.isDaylight !== wantDaylight && prevZoneChange.isDaylight === wantDaylight) {
          zoneChange = prevZoneChange;
        }
      }
    }

    return zoneChange.utcOffset;
  }

  _findNearbyChange(change) {
    const idx = binsearchInsert(this.changes, change, Timezone._compare_change_fn);

    if (idx >= this.changes.length) {
      return this.changes.length - 1;
    }

    return idx;
  }

  _ensureCoverage(aYear) {
    if (Timezone._minimumExpansionYear === -1) {
      const today = Time.now();
      Timezone._minimumExpansionYear = today.year;
    }

    let changesEndYear = aYear;

    if (changesEndYear < Timezone._minimumExpansionYear) {
      changesEndYear = Timezone._minimumExpansionYear;
    }

    changesEndYear += Timezone.EXTRA_COVERAGE;

    if (changesEndYear > Timezone.MAX_YEAR) {
      changesEndYear = Timezone.MAX_YEAR;
    }

    if (!this.changes.length || this.expandedUntilYear < aYear) {
      const subcomps = this.component.getAllSubcomponents();
      const compLen = subcomps.length;
      let compIdx = 0;

      for (; compIdx < compLen; compIdx++) {
        this._expandComponent(subcomps[compIdx], changesEndYear, this.changes);
      }

      this.changes.sort(Timezone._compare_change_fn);
      this.expandedUntilYear = changesEndYear;
    }
  }

  _expandComponent(aComponent, aYear, changes) {
    if (!aComponent.hasProperty('dtstart') || !aComponent.hasProperty('tzoffsetto') || !aComponent.hasProperty('tzoffsetfrom')) {
      return;
    }

    const dtstart = aComponent.getFirstProperty('dtstart').getFirstValue();
    let change = {};

    function convert_tzoffset(offset) {
      return offset.factor * (offset.hours * 3600 + offset.minutes * 60);
    }

    function initChanges() {
      return {
        isDaylight: aComponent.name === 'daylight',
        utcOffset: convert_tzoffset(aComponent.getFirstProperty('tzoffsetto').getFirstValue()),
        prevUtcOffset: convert_tzoffset(aComponent.getFirstProperty('tzoffsetfrom').getFirstValue())
      };
    }

    if (!aComponent.hasProperty('rrule') && !aComponent.hasProperty('rdate')) {
      change = initChanges();
      change.year = dtstart.year;
      change.month = dtstart.month;
      change.day = dtstart.day;
      change.hour = dtstart.hour;
      change.minute = dtstart.minute;
      change.second = dtstart.second;
      Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset);
      changes.push(change);
    } else {
      const props = aComponent.getAllProperties('rdate');

      for (const rdatekey in props) {
        if (!props.hasOwnProperty(rdatekey)) {
          continue;
        }

        const rdate = props[rdatekey];
        const time = rdate.getFirstValue();
        change = initChanges();
        change.year = time.year;
        change.month = time.month;
        change.day = time.day;

        if (time.isDate) {
          change.hour = dtstart.hour;
          change.minute = dtstart.minute;
          change.second = dtstart.second;

          if (dtstart.zone !== Timezone.utcTimezone) {
            Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset);
          }
        } else {
          change.hour = time.hour;
          change.minute = time.minute;
          change.second = time.second;

          if (time.zone !== Timezone.utcTimezone) {
            Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset);
          }
        }

        changes.push(change);
      }

      let rrule = aComponent.getFirstProperty('rrule');

      if (rrule) {
        rrule = rrule.getFirstValue();
        change = initChanges();

        if (rrule.until && rrule.until.zone === Timezone.utcTimezone) {
          rrule.until.adjust(0, 0, 0, change.prevUtcOffset);
          rrule.until.zone = Timezone.localTimezone;
        }

        const iterator = rrule.iterator(dtstart);
        let occ;

        while (occ = iterator.next()) {
          change = initChanges();

          if (occ.year > aYear || !occ) {
            break;
          }

          change.year = occ.year;
          change.month = occ.month;
          change.day = occ.day;
          change.hour = occ.hour;
          change.minute = occ.minute;
          change.second = occ.second;
          change.isDate = occ.isDate;
          Timezone.adjustChange(change, 0, 0, 0, -change.prevUtcOffset);
          changes.push(change);
        }
      }
    }

    return changes;
  }

  toString() {
    return this.tznames ? this.tznames : this.tzid;
  }

  static _compare_change_fn(a, b) {
    if (a.year < b.year) return -1;else if (a.year > b.year) return 1;
    if (a.month < b.month) return -1;else if (a.month > b.month) return 1;
    if (a.day < b.day) return -1;else if (a.day > b.day) return 1;
    if (a.hour < b.hour) return -1;else if (a.hour > b.hour) return 1;
    if (a.minute < b.minute) return -1;else if (a.minute > b.minute) return 1;
    if (a.second < b.second) return -1;else if (a.second > b.second) return 1;
    return 0;
  }

  static convert_time(tt, from_zone, to_zone) {
    if (tt.isDate || from_zone.tzid === to_zone.tzid || from_zone === Timezone.localTimezone || to_zone === Timezone.localTimezone) {
      tt.zone = to_zone;
      return tt;
    }

    let utcOffset = from_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, -utcOffset);
    utcOffset = to_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, utcOffset);
  }

  static fromData(aData) {
    const tt = new Timezone();
    return tt.fromData(aData);
  }

  static get utcTimezone() {
    return Timezone.fromData({
      tzid: 'UTC'
    });
  }

  static get localTimezone() {
    return Timezone.fromData({
      tzid: 'floating'
    });
  }

  static adjustChange(change, days, hours, minutes, seconds) {
    return Time.prototype.adjust.call(change, days, hours, minutes, seconds, change);
  }

}
Timezone._minimumExpansionYear = -1;
Timezone.MAX_YEAR = 2035;
Timezone.EXTRA_COVERAGE = 5;

__decorate([memoize], Timezone, "utcTimezone", null);

__decorate([memoize], Timezone, "localTimezone", null);

const zones = new Map();
function reset() {
  const utc = Timezone.utcTimezone;
  zones.clear();
  zones.set('Z', utc);
  zones.set('UTC', utc);
  zones.set('GMT', utc);
}
function has(tzid) {
  return zones.has(tzid);
}
function get(tzid) {
  return zones.get(tzid);
}
function register(name, timezone) {
  if (name != null && name instanceof Component) {
    if (name.name === 'vtimezone') {
      timezone = new Timezone(name);
      name = timezone.tzid;
    }
  }

  if (timezone instanceof Timezone) {
    zones.set(name, timezone);
  } else {
    throw new TypeError('timezone must be Timezone or Component, got ' + typeof timezone);
  }
}
function remove(tzid) {
  zones.delete(tzid);
}

var TimezoneService = /*#__PURE__*/Object.freeze({
  zones: zones,
  reset: reset,
  has: has,
  get: get,
  register: register,
  remove: remove
});

exports.foldLength = 75;
function setFoldLength(length) {
  exports.foldLength = length;
}
const newLineChar = '\r\n';
function updateTimezones(vcal) {
  let allsubs, properties, vtimezones, reqTzid, i, tzid;

  if (!vcal || vcal.name !== 'vcalendar') {
    return vcal;
  }

  allsubs = vcal.getAllSubcomponents();
  properties = [];
  vtimezones = {};

  for (i = 0; i < allsubs.length; i++) {
    if (allsubs[i].name === 'vtimezone') {
      tzid = allsubs[i].getFirstProperty('tzid').getFirstValue();
      vtimezones[tzid] = allsubs[i];
    } else {
      properties = properties.concat(allsubs[i].getAllProperties());
    }
  }

  reqTzid = {};

  for (i = 0; i < properties.length; i++) {
    if (tzid = properties[i].getParameter('tzid')) {
      reqTzid[tzid] = true;
    }
  }

  for (i in vtimezones) {
    if (vtimezones.hasOwnProperty(i) && !reqTzid[i]) {
      vcal.removeSubcomponent(vtimezones[i]);
    }
  }

  for (i in reqTzid) {
    if (reqTzid.hasOwnProperty(i) && !vtimezones[i] && has(i)) {
      vcal.addSubcomponent(get(i).component);
    }
  }

  return vcal;
}
function strictParseInt(string) {
  const result = parseInt(string, 10);

  if (Number.isNaN(result)) {
    throw new TypeError('Could not extract integer from "' + string + '"');
  }

  return result;
}
function formatClassType(data, type) {
  if (data instanceof type) {
    return data;
  }

  return new type(data);
}
function unescapedIndexOf(buffer, search, pos) {
  while ((pos = buffer.indexOf(search, pos)) !== -1) {
    if (pos && pos > 0 && buffer[pos - 1] === '\\') {
      pos += 1;
    } else {
      return pos;
    }
  }

  return -1;
}
function binsearchInsert(list, seekVal, cmpfunc) {
  if (!list.length) return 0;
  let low = 0;
  let high = list.length - 1;
  let mid = 0;
  let cmpval = 0;

  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0) high = mid - 1;else if (cmpval > 0) low = mid + 1;else break;
  }

  if (cmpval < 0) return mid;else if (cmpval > 0) return mid + 1;else return mid;
}
function clone(aSrc, aDeep) {
  if (!aSrc || typeof aSrc !== 'object') {
    return aSrc;
  } else if (aSrc instanceof Date) {
    return new Date(aSrc.getTime());
  } else if ('clone' in aSrc) {
    return aSrc['clone']();
  } else if (Array.isArray(aSrc)) {
    const arr = [];

    for (let i = 0; i < aSrc.length; i++) {
      arr.push(aDeep ? clone(aSrc[i], true) : aSrc[i]);
    }

    return arr;
  } else {
    const obj = {};

    for (const name in aSrc) {
      if (Object.prototype.hasOwnProperty.call(aSrc, name)) {
        if (aDeep) {
          obj[name] = clone(aSrc[name], true);
        } else {
          obj[name] = aSrc[name];
        }
      }
    }

    return obj;
  }
}
function foldline(line = '') {
  let result = '';

  while (line.length) {
    result += newLineChar + ' ' + line.substr(0, exports.foldLength);
    line = line.substr(exports.foldLength);
  }

  return result.substr(newLineChar.length + 1);
}
function pad2(data) {
  if (typeof data !== 'string') {
    if (typeof data === 'number') {
      data = parseInt(String(data));
    }

    data = String(data);
  }

  const len = data.length;

  switch (len) {
    case 0:
      return '00';

    case 1:
      return '0' + data;

    default:
      return data;
  }
}
function trunc(num) {
  return num < 0 ? Math.ceil(num) : Math.floor(num);
}

var helpers = /*#__PURE__*/Object.freeze({
  get foldLength () { return exports.foldLength; },
  setFoldLength: setFoldLength,
  newLineChar: newLineChar,
  updateTimezones: updateTimezones,
  strictParseInt: strictParseInt,
  formatClassType: formatClassType,
  unescapedIndexOf: unescapedIndexOf,
  binsearchInsert: binsearchInsert,
  clone: clone,
  foldline: foldline,
  pad2: pad2,
  trunc: trunc
});

const DURATION_LETTERS = /([PDWHMTS]{1,1})/;
class Duration {
  constructor(data) {
    this.weeks = 0;
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.isNegative = false;
    this.icaltype = 'duration';
    this.fromData(data);
  }

  clone() {
    return Duration.fromData(this);
  }

  toSeconds() {
    const seconds = this.seconds + 60 * this.minutes + 3600 * this.hours + 86400 * this.days + 7 * 86400 * this.weeks;
    return this.isNegative ? -seconds : seconds;
  }

  fromSeconds(aSeconds) {
    let secs = Math.abs(aSeconds);
    this.isNegative = aSeconds < 0;
    this.days = trunc(secs / 86400);

    if (this.days % 7 === 0) {
      this.weeks = this.days / 7;
      this.days = 0;
    } else {
      this.weeks = 0;
    }

    secs -= (this.days + 7 * this.weeks) * 86400;
    this.hours = trunc(secs / 3600);
    secs -= this.hours * 3600;
    this.minutes = trunc(secs / 60);
    secs -= this.minutes * 60;
    this.seconds = secs;
    return this;
  }

  fromData(aData = {}) {
    Object.assign(this, aData);
  }

  reset() {
    this.isNegative = false;
    this.weeks = 0;
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
  }

  compare(aOther) {
    const thisSeconds = this.toSeconds();
    const otherSeconds = aOther.toSeconds();
    return +(thisSeconds > otherSeconds) - +(thisSeconds < otherSeconds);
  }

  normalize() {
    this.fromSeconds(this.toSeconds());
  }

  toString() {
    if (this.toSeconds() === 0) {
      return 'PT0S';
    } else {
      let str = '';
      if (this.isNegative) str += '-';
      str += 'P';
      if (this.weeks) str += this.weeks + 'W';
      if (this.days) str += this.days + 'D';

      if (this.hours || this.minutes || this.seconds) {
        str += 'T';
        if (this.hours) str += this.hours + 'H';
        if (this.minutes) str += this.minutes + 'M';
        if (this.seconds) str += this.seconds + 'S';
      }

      return str;
    }
  }

  toICALString() {
    return this.toString();
  }

  static fromSeconds(aSeconds) {
    return new Duration().fromSeconds(aSeconds);
  }

  static isValueString(str) {
    return str[0] === 'P' || str[1] === 'P';
  }

  static fromString(aStr) {
    let pos = 0;
    const dict = Object.create(null);
    let chunks = 0;

    while ((pos = aStr.search(DURATION_LETTERS)) !== -1) {
      const type = aStr[pos];
      const numeric = aStr.substr(0, pos);
      aStr = aStr.substr(pos + 1);
      chunks += parseDurationChunk(type, numeric, dict);
    }

    if (chunks < 2) {
      throw Error(`invalid duration value: Not enough duration components in "${aStr}"`);
    }

    return new Duration(dict);
  }

  static fromData(aData) {
    return new Duration(aData);
  }

}

function parseDurationChunk(letter, number, object) {
  let type;

  switch (letter) {
    case 'P':
      if (number && number === '-') {
        object.isNegative = true;
      } else {
        object.isNegative = false;
      }

      break;

    case 'D':
      type = 'days';
      break;

    case 'W':
      type = 'weeks';
      break;

    case 'H':
      type = 'hours';
      break;

    case 'M':
      type = 'minutes';
      break;

    case 'S':
      type = 'seconds';
      break;

    default:
      return 0;
  }

  if (type) {
    if (!number && number !== '0') {
      throw TypeError(`invalid duration value: Missing number before "${letter}"`);
    }

    const num = parseInt(number, 10);

    if (Number.isNaN(num)) {
      throw TypeError(`invalid duration value: Invalid number "${number}" before "${letter}"`);
    }

    object[type] = num;
  }

  return 1;
}

class UtcOffset {
  constructor(aData) {
    this.hours = 0;
    this.minutes = 0;
    this.factor = 1;
    this.icaltype = 'utc-offset';
    this.fromData(aData);
  }

  clone() {
    return UtcOffset.fromSeconds(this.toSeconds());
  }

  fromData(aData) {
    if (aData) {
      for (const key in aData) {
        if (aData.hasOwnProperty(key)) {
          this[key] = aData[key];
        }
      }
    }

    this._normalize();

    return this;
  }

  fromSeconds(aSeconds) {
    let secs = Math.abs(aSeconds);
    this.factor = aSeconds < 0 ? -1 : 1;
    this.hours = trunc(secs / 3600);
    secs -= this.hours * 3600;
    this.minutes = trunc(secs / 60);
    return this;
  }

  toSeconds() {
    return this.factor * (60 * this.minutes + 3600 * this.hours);
  }

  compare(other) {
    const a = this.toSeconds();
    const b = other.toSeconds();
    return +(a > b) - +(b > a);
  }

  _normalize() {
    let secs = this.toSeconds();
    const factor = this.factor;

    while (secs < -43200) {
      secs += 97200;
    }

    while (secs > 50400) {
      secs -= 97200;
    }

    this.fromSeconds(secs);

    if (secs === 0) {
      this.factor = factor;
    }
  }

  toICALString() {
    return design.icalendar.value['utc-offset'].toICAL(this.toString());
  }

  toString() {
    return `${(this.factor === 1 ? '+' : '-') + pad2(this.hours)}:${pad2(this.minutes)}`;
  }

  static fromString(aString) {
    return new UtcOffset({
      factor: aString[0] === '+' ? 1 : -1,
      hours: strictParseInt(aString.substr(1, 2)),
      minutes: strictParseInt(aString.substr(4, 2))
    });
  }

  static fromSeconds(aSeconds) {
    const instance = new UtcOffset();
    instance.fromSeconds(aSeconds);
    return instance;
  }

}

class VCardTime extends Time {
  constructor(data, zone, icaltype) {
    super();
    const time = this._time = Object.create(null);
    time.year = null;
    time.month = null;
    time.day = null;
    time.hour = null;
    time.minute = null;
    time.second = null;
    this._icaltype = icaltype || 'date-and-or-time';
    this.fromData(data, zone);
  }

  get icaltype() {
    return this._icaltype;
  }

  clone() {
    return new VCardTime(this._time, this.zone, this.icaltype);
  }

  _normalize() {
    return this;
  }

  utcOffset() {
    if (this.zone instanceof UtcOffset) {
      return this.zone.toSeconds();
    } else {
      return Time.prototype.utcOffset.apply(this, arguments);
    }
  }

  toICALString() {
    return design.vcard.value[this.icaltype].toICAL(this.toString());
  }

  toString() {
    const p2 = pad2;
    const y = this.year,
          m = this.month,
          d = this.day;
    const h = this.hour,
          mm = this.minute,
          s = this.second;
    const hasYear = y != null,
          hasMonth = m != null,
          hasDay = d != null;
    const hasHour = h != null,
          hasMinute = mm != null,
          hasSecond = s != null;
    const datepart = (hasYear ? p2(y) + (hasMonth || hasDay ? '-' : '') : hasMonth || hasDay ? '--' : '') + (hasMonth ? p2(m) : '') + (hasDay ? '-' + p2(d) : '');
    const timepart = (hasHour ? p2(h) : '-') + (hasHour && hasMinute ? ':' : '') + (hasMinute ? p2(mm) : '') + (!hasHour && !hasMinute ? '-' : '') + (hasMinute && hasSecond ? ':' : '') + (hasSecond ? p2(s) : '');
    let zone;

    if (this.zone === Timezone.utcTimezone) {
      zone = 'Z';
    } else if (this.zone instanceof UtcOffset) {
      zone = this.zone.toString();
    } else if (this.zone === Timezone.localTimezone) {
      zone = '';
    } else if (this.zone instanceof Timezone) {
      const offset = UtcOffset.fromSeconds(this.zone.utcOffset(this));
      zone = offset.toString();
    } else {
      zone = '';
    }

    switch (this.icaltype) {
      case 'time':
        return timepart + zone;

      case 'date-and-or-time':
      case 'date-time':
        return datepart + (timepart === '--' ? '' : 'T' + timepart + zone);

      case 'date':
        return datepart;
    }

    return '';
  }

  static fromDateAndOrTimeString(aValue, aIcalType) {
    function part(v, s, e) {
      return v ? strictParseInt(v.substr(s, e)) : undefined;
    }

    const parts = aValue.split('T');
    const dt = parts[0],
          tmz = parts[1];
    const splitzone = tmz ? design.vcard.value.time._splitZone(tmz) : [];
    let zone = splitzone[0];
    const tm = splitzone[1];
    const dtlen = dt ? dt.length : 0;
    const tmlen = tm ? tm.length : 0;
    const hasDashDate = dt && dt[0] === '-' && dt[1] === '-' || false;
    const hasDashTime = tm && tm[0] === '-';
    const o = {
      year: hasDashDate ? undefined : part(dt, 0, 4),
      month: hasDashDate && (dtlen === 4 || dtlen === 7) ? part(dt, 2, 2) : dtlen === 7 ? part(dt, 5, 2) : dtlen === 10 ? part(dt, 5, 2) : undefined,
      day: dtlen === 5 ? part(dt, 3, 2) : dtlen === 7 && hasDashDate ? part(dt, 5, 2) : dtlen === 10 ? part(dt, 8, 2) : undefined,
      hour: hasDashTime ? undefined : part(tm, 0, 2),
      minute: hasDashTime && tmlen === 3 ? part(tm, 1, 2) : tmlen > 4 ? hasDashTime ? part(tm, 1, 2) : part(tm, 3, 2) : undefined,
      second: tmlen === 4 ? part(tm, 2, 2) : tmlen === 6 ? part(tm, 4, 2) : tmlen === 8 ? part(tm, 6, 2) : undefined
    };

    if (zone === 'Z') {
      zone = Timezone.utcTimezone;
    } else if (zone && zone[3] === ':') {
      zone = UtcOffset.fromString(zone);
    } else {
      zone = null;
    }

    return new VCardTime(o, zone, aIcalType);
  }

}

class Period {
  constructor(aData) {
    this.icaltype = 'period';

    if (aData && 'start' in aData) {
      if (aData.start && !(aData.start instanceof Time)) {
        throw new TypeError('.start must be an instance of Time');
      }

      this.start = aData.start;
    }

    if (aData && 'end' in aData && 'duration' in aData) {
      throw new Error('cannot accept both end and duration');
    }

    if (aData && 'end' in aData) {
      if (aData.end && !(aData.end instanceof Time)) {
        throw new TypeError('.end must be an instance of Time');
      }

      this.end = aData.end;
    }

    if (aData && 'duration' in aData) {
      if (aData.duration && !(aData.duration instanceof Duration)) {
        throw new TypeError('.duration must be an instance of Duration');
      }

      this.duration = aData.duration;
    }
  }

  clone() {
    const period = Period.fromData(Object.assign({
      start: this.start && this.start.clone()
    }, this.duration ? {
      duration: this.duration.clone()
    } : {
      end: this.end && this.end.clone()
    }));
    return period;
  }

  getDuration() {
    if (this.duration) {
      return this.duration;
    } else {
      return this.end.subtractDate(this.start);
    }
  }

  getEnd() {
    if (this.end) {
      return this.end;
    } else {
      const end = this.start.clone();
      end.addDuration(this.duration);
      return end;
    }
  }

  toString() {
    return this.start + '/' + (this.end || this.duration);
  }

  toJSON() {
    return [this.start.toString(), (this.end || this.duration).toString()];
  }

  toICALString() {
    return this.start.toICALString() + '/' + (this.end || this.duration).toICALString();
  }

  static fromString(str, prop) {
    const parts = str.split('/');

    if (parts.length !== 2) {
      throw new Error('Invalid string value: "' + str + '" must contain a "/" char.');
    }

    const options = {
      start: Time.fromDateTimeString(parts[0], prop)
    };
    const end = parts[1];

    if (Duration.isValueString(end)) {
      options.duration = Duration.fromString(end);
    } else {
      options.end = Time.fromDateTimeString(end, prop);
    }

    return new Period(options);
  }

  static fromData(aData) {
    return new Period(aData);
  }

  static fromJSON(aData, aProp) {
    if (Duration.isValueString(aData[1])) {
      return Period.fromData({
        start: Time.fromDateTimeString(aData[0], aProp),
        duration: Duration.fromString(aData[1])
      });
    } else {
      return Period.fromData({
        start: Time.fromDateTimeString(aData[0], aProp),
        end: Time.fromDateTimeString(aData[1], aProp)
      });
    }
  }

}

class RecurIterator {
  constructor(options) {
    this.completed = false;
    this.occurrence_number = 0;
    this.initialized = false;
    this.days_index = 0;
    this.fromData(options);
  }

  fromData(options) {
    this.rule = formatClassType(options.rule, Recur);

    if (!this.rule) {
      throw new Error('iterator requires a (Recur) rule');
    }

    this.dtstart = formatClassType(options.dtstart, Time);

    if (!this.dtstart) {
      throw new Error('iterator requires a (Time) dtstart');
    }

    if (options.by_data) {
      this.by_data = options.by_data;
    } else {
      this.by_data = clone(this.rule.parts, true);
    }

    if (options.occurrence_number) this.occurrence_number = options.occurrence_number;
    this.days = options.days || [];

    if (options.last) {
      this.last = formatClassType(options.last, Time);
    }

    this.by_indices = options.by_indices;

    if (!this.by_indices) {
      this.by_indices = {
        BYSECOND: 0,
        BYMINUTE: 0,
        BYHOUR: 0,
        BYDAY: 0,
        BYMONTH: 0,
        BYWEEKNO: 0,
        BYMONTHDAY: 0
      };
    }

    this.initialized = options.initialized || false;

    if (!this.initialized) {
      this.init();
    }
  }

  init() {
    this.initialized = true;
    this.last = this.dtstart.clone();
    const parts = this.by_data;

    if ('BYDAY' in parts) {
      this.sort_byday_rules(parts.BYDAY, this.rule.wkst);
    }

    if ('BYYEARDAY' in parts) {
      if ('BYMONTH' in parts || 'BYWEEKNO' in parts || 'BYMONTHDAY' in parts || 'BYDAY' in parts) {
        throw new Error('Invalid BYYEARDAY rule');
      }
    }

    if ('BYWEEKNO' in parts && 'BYMONTHDAY' in parts) {
      throw new Error('BYWEEKNO does not fit to BYMONTHDAY');
    }

    if (this.rule.freq === 'MONTHLY' && ('BYYEARDAY' in parts || 'BYWEEKNO' in parts)) {
      throw new Error('For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear');
    }

    if (this.rule.freq === 'WEEKLY' && ('BYYEARDAY' in parts || 'BYMONTHDAY' in parts)) {
      throw new Error('For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear');
    }

    if (this.rule.freq !== 'YEARLY' && 'BYYEARDAY' in parts) {
      throw new Error('BYYEARDAY may only appear in YEARLY rules');
    }

    this.last.second = this.setup_defaults('BYSECOND', 'SECONDLY', this.dtstart.second);
    this.last.minute = this.setup_defaults('BYMINUTE', 'MINUTELY', this.dtstart.minute);
    this.last.hour = this.setup_defaults('BYHOUR', 'HOURLY', this.dtstart.hour);
    this.last.day = this.setup_defaults('BYMONTHDAY', 'DAILY', this.dtstart.day);
    this.last.month = this.setup_defaults('BYMONTH', 'MONTHLY', this.dtstart.month);

    if (this.rule.freq === 'WEEKLY') {
      if ('BYDAY' in parts) {
        const bydayParts = this.ruleDayOfWeek(parts.BYDAY[0]);
        const dow = bydayParts[1];
        const wkdy = dow - this.last.dayOfWeek();

        if (this.last.dayOfWeek() < dow && wkdy >= 0 || wkdy < 0) {
          this.last.day += wkdy;
        }
      } else {
        const dayName = Recur.numericDayToIcalDay(this.dtstart.dayOfWeek());
        parts.BYDAY = [dayName];
      }
    }

    if (this.rule.freq === 'YEARLY') {
      for (;;) {
        this.expand_year_days(this.last.year);

        if (this.days.length > 0) {
          break;
        }

        this.increment_year(this.rule.interval);
      }

      this._nextByYearDay();
    }

    if (this.rule.freq === 'MONTHLY' && this.has_by_data('BYDAY')) {
      let tempLast;
      const initLast = this.last.clone();
      let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);

      for (const i in this.by_data.BYDAY) {
        if (!this.by_data.BYDAY.hasOwnProperty(i)) {
          continue;
        }

        this.last = initLast.clone();
        const bydayParts = this.ruleDayOfWeek(this.by_data.BYDAY[i]);
        const pos = bydayParts[0];
        const dow = bydayParts[1];
        let dayOfMonth = this.last.nthWeekDay(dow, pos);

        if (pos >= 6 || pos <= -6) {
          throw new Error('Malformed values in BYDAY part');
        }

        if (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
          if (tempLast && tempLast.month === initLast.month) {
            continue;
          }

          while (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
            this.increment_month();
            daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
            dayOfMonth = this.last.nthWeekDay(dow, pos);
          }
        }

        this.last.day = dayOfMonth;

        if (!tempLast || this.last.compare(tempLast) < 0) {
          tempLast = this.last.clone();
        }
      }

      this.last = tempLast.clone();

      if (this.has_by_data('BYMONTHDAY')) {
        this._byDayAndMonthDay(true);
      }

      if (this.last.day > daysInMonth || this.last.day === 0) {
        throw new Error('Malformed values in BYDAY part');
      }
    } else if (this.has_by_data('BYMONTHDAY')) {
      if (this.last.day < 0) {
        const daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
        this.last.day = daysInMonth + this.last.day + 1;
      }
    }
  }

  next() {
    const before = this.last ? this.last.clone() : undefined;

    if (this.rule.count && this.occurrence_number >= this.rule.count || this.rule.until && this.last.compare(this.rule.until) > 0) {
      this.completed = true;
      return;
    }

    if (this.occurrence_number === 0 && this.last.compare(this.dtstart) >= 0) {
      this.occurrence_number++;
      return this.last;
    }

    let valid;

    do {
      valid = 1;

      switch (this.rule.freq) {
        case 'SECONDLY':
          this.next_second();
          break;

        case 'MINUTELY':
          this.next_minute();
          break;

        case 'HOURLY':
          this.next_hour();
          break;

        case 'DAILY':
          this.next_day();
          break;

        case 'WEEKLY':
          this.next_week();
          break;

        case 'MONTHLY':
          valid = this.next_month();
          break;

        case 'YEARLY':
          this.next_year();
          break;

        default:
          return;
      }
    } while (!this.check_contracting_rules() || this.last.compare(this.dtstart) < 0 || !valid);

    if (this.last.compare(before) === 0) {
      throw new Error('Same occurrence found twice, protecting ' + 'you from death by recursion');
    }

    if (this.rule.until && this.last.compare(this.rule.until) > 0) {
      this.completed = true;
      return;
    } else {
      this.occurrence_number++;
      return this.last;
    }
  }

  next_second() {
    return this.next_generic('BYSECOND', 'SECONDLY', 'second', 'minute');
  }

  increment_second(inc) {
    return this.increment_generic(inc, 'second', 60, 'minute');
  }

  next_minute() {
    return this.next_generic('BYMINUTE', 'MINUTELY', 'minute', 'hour', 'next_second');
  }

  increment_minute(inc) {
    return this.increment_generic(inc, 'minute', 60, 'hour');
  }

  next_hour() {
    return this.next_generic('BYHOUR', 'HOURLY', 'hour', 'monthday', 'next_minute');
  }

  increment_hour(inc) {
    this.increment_generic(inc, 'hour', 24, 'monthday');
  }

  next_day() {
    const this_freq = this.rule.freq === 'DAILY';

    if (this.next_hour() === 0) {
      return 0;
    }

    if (this_freq) {
      this.increment_monthday(this.rule.interval);
    } else {
      this.increment_monthday(1);
    }

    return 0;
  }

  next_week() {
    let end_of_data = 0;

    if (this.next_weekday_by_week() === 0) {
      return end_of_data;
    }

    if (this.has_by_data('BYWEEKNO')) {
      if (this.by_indices.BYWEEKNO === this.by_data.BYWEEKNO.length) {
        this.by_indices.BYWEEKNO = 0;
        end_of_data = 1;
      }

      this.last.month = 1;
      this.last.day = 1;
      const week_no = this.by_data.BYWEEKNO[this.by_indices.BYWEEKNO];
      this.last.day += 7 * week_no;

      if (end_of_data) {
        this.increment_year(1);
      }
    } else {
      this.increment_monthday(7 * this.rule.interval);
    }

    return end_of_data;
  }

  normalizeByMonthDayRules(year, month, rules) {
    const daysInMonth = Time.daysInMonth(month, year);
    const newRules = [];
    let ruleIdx = 0;
    const len = rules.length;
    let rule;

    for (; ruleIdx < len; ruleIdx++) {
      rule = rules[ruleIdx];

      if (Math.abs(rule) > daysInMonth) {
        continue;
      }

      if (rule < 0) {
        rule = daysInMonth + (rule + 1);
      } else if (rule === 0) {
        continue;
      }

      if (newRules.indexOf(rule) === -1) {
        newRules.push(rule);
      }
    }

    return newRules.sort(function (a, b) {
      return a - b;
    });
  }

  _byDayAndMonthDay(isInit) {
    let byMonthDay;
    const byDay = this.by_data.BYDAY;
    let date;
    let dateIdx = 0;
    let dateLen;
    const dayLen = byDay.length;
    let dataIsValid = 0;
    let daysInMonth;
    const self = this;
    let lastDay = this.last.day;

    function initMonth() {
      daysInMonth = Time.daysInMonth(self.last.month, self.last.year);
      byMonthDay = self.normalizeByMonthDayRules(self.last.year, self.last.month, self.by_data.BYMONTHDAY);
      dateLen = byMonthDay.length;

      while (byMonthDay[dateIdx] <= lastDay && !(isInit && byMonthDay[dateIdx] === lastDay) && dateIdx < dateLen - 1) {
        dateIdx++;
      }
    }

    function nextMonth() {
      lastDay = 0;
      self.increment_month();
      dateIdx = 0;
      initMonth();
    }

    initMonth();

    if (isInit) {
      lastDay -= 1;
    }

    let monthsCounter = 48;

    while (!dataIsValid && monthsCounter) {
      monthsCounter--;
      date = lastDay + 1;

      if (date > daysInMonth) {
        nextMonth();
        continue;
      }

      const next = byMonthDay[dateIdx++];

      if (next >= date) {
        lastDay = next;
      } else {
        nextMonth();
        continue;
      }

      for (let dayIdx = 0; dayIdx < dayLen; dayIdx++) {
        const parts = this.ruleDayOfWeek(byDay[dayIdx]);
        const pos = parts[0];
        const dow = parts[1];
        this.last.day = lastDay;

        if (this.last.isNthWeekDay(dow, pos)) {
          dataIsValid = 1;
          break;
        }
      }

      if (!dataIsValid && dateIdx === dateLen) {
        nextMonth();
        continue;
      }
    }

    if (monthsCounter <= 0) {
      throw new Error('Malformed values in BYDAY combined with BYMONTHDAY parts');
    }

    return dataIsValid;
  }

  next_month() {
    let data_valid = 1;

    if (this.next_hour() === 0) {
      return data_valid;
    }

    if (this.has_by_data('BYDAY') && this.has_by_data('BYMONTHDAY')) {
      data_valid = this._byDayAndMonthDay();
    } else if (this.has_by_data('BYDAY')) {
      const daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      let setpos = 0;
      let setpos_total = 0;

      if (this.has_by_data('BYSETPOS')) {
        const last_day = this.last.day;

        for (let day = 1; day <= daysInMonth; day++) {
          this.last.day = day;

          if (this.is_day_in_byday(this.last)) {
            setpos_total++;

            if (day <= last_day) {
              setpos++;
            }
          }
        }

        this.last.day = last_day;
      }

      data_valid = 0;
      let day;

      for (day = this.last.day + 1; day <= daysInMonth; day++) {
        this.last.day = day;

        if (this.is_day_in_byday(this.last)) {
          if (!this.has_by_data('BYSETPOS') || this.check_set_position(++setpos) || this.check_set_position(setpos - setpos_total - 1)) {
            data_valid = 1;
            break;
          }
        }
      }

      if (day > daysInMonth) {
        this.last.day = 1;
        this.increment_month();

        if (this.is_day_in_byday(this.last)) {
          if (!this.has_by_data('BYSETPOS') || this.check_set_position(1)) {
            data_valid = 1;
          }
        } else {
          data_valid = 0;
        }
      }
    } else if (this.has_by_data('BYMONTHDAY')) {
      this.by_indices.BYMONTHDAY++;

      if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
        this.by_indices.BYMONTHDAY = 0;
        this.increment_month();
      }

      const daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      let day = this.by_data.BYMONTHDAY[this.by_indices.BYMONTHDAY];

      if (day < 0) {
        day = daysInMonth + day + 1;
      }

      if (day > daysInMonth) {
        this.last.day = 1;
        data_valid = this.is_day_in_byday(this.last);
      } else {
        this.last.day = day;
      }
    } else {
      this.increment_month();
      const daysInMonth = Time.daysInMonth(this.last.month, this.last.year);

      if (this.by_data.BYMONTHDAY[0] > daysInMonth) {
        data_valid = 0;
      } else {
        this.last.day = this.by_data.BYMONTHDAY[0];
      }
    }

    return data_valid;
  }

  next_weekday_by_week() {
    let end_of_data = 0;

    if (this.next_hour() === 0) {
      return end_of_data;
    }

    if (!this.has_by_data('BYDAY')) {
      return 1;
    }

    for (;;) {
      const tt = new Time();
      this.by_indices.BYDAY++;

      if (this.by_indices.BYDAY === Object.keys(this.by_data.BYDAY).length) {
        this.by_indices.BYDAY = 0;
        end_of_data = 1;
      }

      const coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
      const parts = this.ruleDayOfWeek(coded_day);
      let dow = parts[1];
      dow -= this.rule.wkst;

      if (dow < 0) {
        dow += 7;
      }

      tt.year = this.last.year;
      tt.month = this.last.month;
      tt.day = this.last.day;
      const startOfWeek = tt.startDoyWeek(this.rule.wkst);

      if (dow + startOfWeek < 1) {
        if (!end_of_data) {
          continue;
        }
      }

      const next = Time.fromDayOfYear(startOfWeek + dow, this.last.year);
      this.last.year = next.year;
      this.last.month = next.month;
      this.last.day = next.day;
      return end_of_data;
    }
  }

  next_year() {
    if (this.next_hour() === 0) {
      return 0;
    }

    if (++this.days_index === this.days.length) {
      this.days_index = 0;

      do {
        this.increment_year(this.rule.interval);
        this.expand_year_days(this.last.year);
      } while (this.days.length === 0);
    }

    this._nextByYearDay();

    return 1;
  }

  _nextByYearDay() {
    let doy = this.days[this.days_index];
    let year = this.last.year;

    if (doy < 1) {
      doy += 1;
      year += 1;
    }

    const next = Time.fromDayOfYear(doy, year);
    this.last.day = next.day;
    this.last.month = next.month;
  }

  ruleDayOfWeek(dow) {
    const matches = dow.match(/([+-]?[0-9])?(MO|TU|WE|TH|FR|SA|SU)/);

    if (matches) {
      const pos = parseInt(matches[1] || 0, 10);
      dow = Recur.icalDayToNumericDay(matches[2]);
      return [pos, dow];
    } else {
      return [0, 0];
    }
  }

  next_generic(aRuleType, aInterval, aDateAttr, aFollowingAttr, aPreviousIncr) {
    const has_by_rule = aRuleType in this.by_data;
    const this_freq = this.rule.freq === aInterval;
    let end_of_data = 0;

    if (aPreviousIncr && this[aPreviousIncr]() === 0) {
      return end_of_data;
    }

    if (has_by_rule) {
      this.by_indices[aRuleType]++;
      const dta = this.by_data[aRuleType];

      if (this.by_indices[aRuleType] === dta.length) {
        this.by_indices[aRuleType] = 0;
        end_of_data = 1;
      }

      this.last[aDateAttr] = dta[this.by_indices[aRuleType]];
    } else if (this_freq) {
      this['increment_' + aDateAttr](this.rule.interval);
    }

    if (has_by_rule && end_of_data && this_freq) {
      this['increment_' + aFollowingAttr](1);
    }

    return end_of_data;
  }

  increment_monthday(inc) {
    for (let i = 0; i < inc; i++) {
      const daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      this.last.day++;

      if (this.last.day > daysInMonth) {
        this.last.day -= daysInMonth;
        this.increment_month();
      }
    }
  }

  increment_month() {
    this.last.day = 1;

    if (this.has_by_data('BYMONTH')) {
      this.by_indices.BYMONTH++;

      if (this.by_indices.BYMONTH === this.by_data.BYMONTH.length) {
        this.by_indices.BYMONTH = 0;
        this.increment_year(1);
      }

      this.last.month = this.by_data.BYMONTH[this.by_indices.BYMONTH];
    } else {
      if (this.rule.freq === 'MONTHLY') {
        this.last.month += this.rule.interval;
      } else {
        this.last.month++;
      }

      this.last.month--;
      const years = trunc(this.last.month / 12);
      this.last.month %= 12;
      this.last.month++;

      if (years !== 0) {
        this.increment_year(years);
      }
    }
  }

  increment_year(inc) {
    this.last.year += inc;
  }

  increment_generic(inc, aDateAttr, aFactor, aNextIncrement) {
    this.last[aDateAttr] += inc;
    const nextunit = trunc(this.last[aDateAttr] / aFactor);
    this.last[aDateAttr] %= aFactor;

    if (nextunit !== 0) {
      this['increment_' + aNextIncrement](nextunit);
    }
  }

  has_by_data(aRuleType) {
    return aRuleType in this.rule.parts;
  }

  expand_year_days(aYear) {
    const t = new Time();
    this.days = [];
    const parts = {};
    const rules = ['BYDAY', 'BYWEEKNO', 'BYMONTHDAY', 'BYMONTH', 'BYYEARDAY'];

    for (const p in rules) {
      if (rules.hasOwnProperty(p)) {
        const part = rules[p];

        if (part in this.rule.parts) {
          parts[part] = this.rule.parts[part];
        }
      }
    }

    if ('BYMONTH' in parts && 'BYWEEKNO' in parts) {
      let valid = 1;
      const validWeeks = {};
      t.year = aYear;
      t.isDate = true;

      for (let monthIdx = 0; monthIdx < this.by_data.BYMONTH.length; monthIdx++) {
        const month = this.by_data.BYMONTH[monthIdx];
        t.month = month;
        t.day = 1;
        const first_week = t.weekNumber(this.rule.wkst);
        t.day = Time.daysInMonth(month, aYear);
        const last_week = t.weekNumber(this.rule.wkst);

        for (monthIdx = first_week; monthIdx < last_week; monthIdx++) {
          validWeeks[monthIdx] = 1;
        }
      }

      for (let weekIdx = 0; weekIdx < this.by_data.BYWEEKNO.length && valid; weekIdx++) {
        const weekno = this.by_data.BYWEEKNO[weekIdx];

        if (weekno < 52) {
          valid &= validWeeks[weekIdx];
        } else {
          valid = 0;
        }
      }

      if (valid) {
        delete parts.BYMONTH;
      } else {
        delete parts.BYWEEKNO;
      }
    }

    const partCount = Object.keys(parts).length;

    if (partCount === 0) {
      const t1 = this.dtstart.clone();
      t1.year = this.last.year;
      this.days.push(t1.dayOfYear());
    } else if (partCount === 1 && 'BYMONTH' in parts) {
      for (const monthkey in this.by_data.BYMONTH) {
        if (!this.by_data.BYMONTH.hasOwnProperty(monthkey)) {
          continue;
        }

        const t2 = this.dtstart.clone();
        t2.year = aYear;
        t2.month = this.by_data.BYMONTH[monthkey];
        t2.isDate = true;
        this.days.push(t2.dayOfYear());
      }
    } else if (partCount === 1 && 'BYMONTHDAY' in parts) {
      for (const monthdaykey in this.by_data.BYMONTHDAY) {
        if (!this.by_data.BYMONTHDAY.hasOwnProperty(monthdaykey)) {
          continue;
        }

        const t3 = this.dtstart.clone();
        let day_ = this.by_data.BYMONTHDAY[monthdaykey];

        if (day_ < 0) {
          const daysInMonth = Time.daysInMonth(t3.month, aYear);
          day_ = day_ + daysInMonth + 1;
        }

        t3.day = day_;
        t3.year = aYear;
        t3.isDate = true;
        this.days.push(t3.dayOfYear());
      }
    } else if (partCount === 2 && 'BYMONTHDAY' in parts && 'BYMONTH' in parts) {
      for (const monthkey in this.by_data.BYMONTH) {
        if (!this.by_data.BYMONTH.hasOwnProperty(monthkey)) {
          continue;
        }

        const month_ = this.by_data.BYMONTH[monthkey];
        const daysInMonth = Time.daysInMonth(month_, aYear);

        for (const monthdaykey in this.by_data.BYMONTHDAY) {
          if (!this.by_data.BYMONTHDAY.hasOwnProperty(monthdaykey)) {
            continue;
          }

          let day_ = this.by_data.BYMONTHDAY[monthdaykey];

          if (day_ < 0) {
            day_ = day_ + daysInMonth + 1;
          }

          t.day = day_;
          t.month = month_;
          t.year = aYear;
          t.isDate = true;
          this.days.push(t.dayOfYear());
        }
      }
    } else if (partCount === 1 && 'BYWEEKNO' in parts) ; else if (partCount === 2 && 'BYWEEKNO' in parts && 'BYMONTHDAY' in parts) ; else if (partCount === 1 && 'BYDAY' in parts) {
      this.days = this.days.concat(this.expand_by_day(aYear));
    } else if (partCount === 2 && 'BYDAY' in parts && 'BYMONTH' in parts) {
      for (const monthkey in this.by_data.BYMONTH) {
        if (!this.by_data.BYMONTH.hasOwnProperty(monthkey)) {
          continue;
        }

        const month = this.by_data.BYMONTH[monthkey];
        const daysInMonth = Time.daysInMonth(month, aYear);
        t.year = aYear;
        t.month = this.by_data.BYMONTH[monthkey];
        t.day = 1;
        t.isDate = true;
        const first_dow = t.dayOfWeek();
        const doy_offset = t.dayOfYear() - 1;
        t.day = daysInMonth;
        const last_dow = t.dayOfWeek();

        if (this.has_by_data('BYSETPOS')) {
          const by_month_day = [];

          for (let day = 1; day <= daysInMonth; day++) {
            t.day = day;

            if (this.is_day_in_byday(t)) {
              by_month_day.push(day);
            }
          }

          for (let spIndex = 0; spIndex < by_month_day.length; spIndex++) {
            if (this.check_set_position(spIndex + 1) || this.check_set_position(spIndex - by_month_day.length)) {
              this.days.push(doy_offset + by_month_day[spIndex]);
            }
          }
        } else {
          for (const daycodedkey in this.by_data.BYDAY) {
            if (!this.by_data.BYDAY.hasOwnProperty(daycodedkey)) {
              continue;
            }

            const coded_day = this.by_data.BYDAY[daycodedkey];
            const bydayParts = this.ruleDayOfWeek(coded_day);
            const pos = bydayParts[0];
            const dow = bydayParts[1];
            let month_day;
            const first_matching_day = (dow + 7 - first_dow) % 7 + 1;
            const last_matching_day = daysInMonth - (last_dow + 7 - dow) % 7;

            if (pos === 0) {
              for (let day = first_matching_day; day <= daysInMonth; day += 7) {
                this.days.push(doy_offset + day);
              }
            } else if (pos > 0) {
              month_day = first_matching_day + (pos - 1) * 7;

              if (month_day <= daysInMonth) {
                this.days.push(doy_offset + month_day);
              }
            } else {
              month_day = last_matching_day + (pos + 1) * 7;

              if (month_day > 0) {
                this.days.push(doy_offset + month_day);
              }
            }
          }
        }
      }

      this.days.sort(function (a, b) {
        return a - b;
      });
    } else if (partCount === 2 && 'BYDAY' in parts && 'BYMONTHDAY' in parts) {
      const expandedDays = this.expand_by_day(aYear);

      for (const daykey in expandedDays) {
        if (!expandedDays.hasOwnProperty(daykey)) {
          continue;
        }

        const day = expandedDays[daykey];
        const tt = Time.fromDayOfYear(day, aYear);

        if (this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
          this.days.push(day);
        }
      }
    } else if (partCount === 3 && 'BYDAY' in parts && 'BYMONTHDAY' in parts && 'BYMONTH' in parts) {
      const expandedDays = this.expand_by_day(aYear);

      for (const daykey in expandedDays) {
        if (!expandedDays.hasOwnProperty(daykey)) {
          continue;
        }

        const day = expandedDays[daykey];
        const tt = Time.fromDayOfYear(day, aYear);

        if (this.by_data.BYMONTH.indexOf(tt.month) >= 0 && this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
          this.days.push(day);
        }
      }
    } else if (partCount === 2 && 'BYDAY' in parts && 'BYWEEKNO' in parts) {
      const expandedDays = this.expand_by_day(aYear);

      for (const daykey in expandedDays) {
        if (!expandedDays.hasOwnProperty(daykey)) {
          continue;
        }

        const day = expandedDays[daykey];
        const tt = Time.fromDayOfYear(day, aYear);
        const weekno = tt.weekNumber(this.rule.wkst);

        if (this.by_data.BYWEEKNO.indexOf(weekno)) {
          this.days.push(day);
        }
      }
    } else if (partCount === 3 && 'BYDAY' in parts && 'BYWEEKNO' in parts && 'BYMONTHDAY' in parts) ; else if (partCount === 1 && 'BYYEARDAY' in parts) {
      this.days = this.days.concat(this.by_data.BYYEARDAY);
    } else {
      this.days = [];
    }

    return 0;
  }

  expand_by_day(aYear) {
    const days_list = [];
    const tmp = this.last.clone();
    tmp.year = aYear;
    tmp.month = 1;
    tmp.day = 1;
    tmp.isDate = true;
    const start_dow = tmp.dayOfWeek();
    tmp.month = 12;
    tmp.day = 31;
    tmp.isDate = true;
    const end_dow = tmp.dayOfWeek();
    const end_year_day = tmp.dayOfYear();

    for (const daykey in this.by_data.BYDAY) {
      if (!this.by_data.BYDAY.hasOwnProperty(daykey)) {
        continue;
      }

      const day = this.by_data.BYDAY[daykey];
      const parts = this.ruleDayOfWeek(day);
      let pos = parts[0];
      const dow = parts[1];

      if (pos === 0) {
        const tmp_start_doy = (dow + 7 - start_dow) % 7 + 1;

        for (let doy = tmp_start_doy; doy <= end_year_day; doy += 7) {
          days_list.push(doy);
        }
      } else if (pos > 0) {
        let first;

        if (dow >= start_dow) {
          first = dow - start_dow + 1;
        } else {
          first = dow - start_dow + 8;
        }

        days_list.push(first + (pos - 1) * 7);
      } else {
        let last;
        pos = -pos;

        if (dow <= end_dow) {
          last = end_year_day - end_dow + dow;
        } else {
          last = end_year_day - end_dow + dow - 7;
        }

        days_list.push(last - (pos - 1) * 7);
      }
    }

    return days_list;
  }

  is_day_in_byday(tt) {
    for (const daykey in this.by_data.BYDAY) {
      if (!this.by_data.BYDAY.hasOwnProperty(daykey)) {
        continue;
      }

      const day = this.by_data.BYDAY[daykey];
      const parts = this.ruleDayOfWeek(day);
      const pos = parts[0];
      const dow = parts[1];
      const this_dow = tt.dayOfWeek();

      if (pos === 0 && dow === this_dow || tt.nthWeekDay(dow, pos) === tt.day) {
        return 1;
      }
    }

    return 0;
  }

  check_set_position(aPos) {
    if (this.has_by_data('BYSETPOS')) {
      const idx = this.by_data.BYSETPOS.indexOf(aPos);
      return idx !== -1;
    }

    return false;
  }

  sort_byday_rules(aRules, aWeekStart) {
    for (let i = 0; i < aRules.length; i++) {
      for (let j = 0; j < i; j++) {
        let one = this.ruleDayOfWeek(aRules[j])[1];
        let two = this.ruleDayOfWeek(aRules[i])[1];
        one -= aWeekStart;
        two -= aWeekStart;
        if (one < 0) one += 7;
        if (two < 0) two += 7;

        if (one > two) {
          const tmp = aRules[i];
          aRules[i] = aRules[j];
          aRules[j] = tmp;
        }
      }
    }
  }

  check_contract_restriction(aRuleType, v) {
    const indexMapValue = RecurIterator._indexMap[aRuleType];
    const ruleMapValue = RecurIterator._expandMap[this.rule.freq][indexMapValue];
    let pass = false;

    if (aRuleType in this.by_data && ruleMapValue === RecurIterator.CONTRACT) {
      const ruleType = this.by_data[aRuleType];

      for (const bydatakey in ruleType) {
        if (ruleType.hasOwnProperty(bydatakey)) {
          if (ruleType[bydatakey] === v) {
            pass = true;
            break;
          }
        }
      }
    } else {
      pass = true;
    }

    return pass;
  }

  check_contracting_rules() {
    const dow = this.last.dayOfWeek();
    const weekNo = this.last.weekNumber(this.rule.wkst);
    const doy = this.last.dayOfYear();
    return this.check_contract_restriction('BYSECOND', this.last.second) && this.check_contract_restriction('BYMINUTE', this.last.minute) && this.check_contract_restriction('BYHOUR', this.last.hour) && this.check_contract_restriction('BYDAY', Recur.numericDayToIcalDay(dow)) && this.check_contract_restriction('BYWEEKNO', weekNo) && this.check_contract_restriction('BYMONTHDAY', this.last.day) && this.check_contract_restriction('BYMONTH', this.last.month) && this.check_contract_restriction('BYYEARDAY', doy);
  }

  setup_defaults(aRuleType, req, deftime) {
    const indexMapValue = RecurIterator._indexMap[aRuleType];
    const ruleMapValue = RecurIterator._expandMap[this.rule.freq][indexMapValue];

    if (ruleMapValue !== RecurIterator.CONTRACT) {
      if (!(aRuleType in this.by_data)) {
        this.by_data[aRuleType] = [deftime];
      }

      if (this.rule.freq !== req) {
        return this.by_data[aRuleType][0];
      }
    }

    return deftime;
  }

  toJSON() {
    const result = Object.create(null);
    result.initialized = this.initialized;
    result.rule = this.rule.toJSON();
    result.dtstart = this.dtstart.toJSON();
    result.by_data = this.by_data;
    result.days = this.days;
    result.last = this.last.toJSON();
    result.by_indices = this.by_indices;
    result.occurrence_number = this.occurrence_number;
    return result;
  }

}
RecurIterator._indexMap = {
  'BYSECOND': 0,
  'BYMINUTE': 1,
  'BYHOUR': 2,
  'BYDAY': 3,
  'BYMONTHDAY': 4,
  'BYYEARDAY': 5,
  'BYWEEKNO': 6,
  'BYMONTH': 7,
  'BYSETPOS': 8
};
RecurIterator._expandMap = {
  'SECONDLY': [1, 1, 1, 1, 1, 1, 1, 1],
  'MINUTELY': [2, 1, 1, 1, 1, 1, 1, 1],
  'HOURLY': [2, 2, 1, 1, 1, 1, 1, 1],
  'DAILY': [2, 2, 2, 1, 1, 1, 1, 1],
  'WEEKLY': [2, 2, 2, 2, 3, 3, 1, 1],
  'MONTHLY': [2, 2, 2, 2, 2, 3, 3, 1],
  'YEARLY': [2, 2, 2, 2, 2, 2, 2, 2]
};
RecurIterator.UNKNOWN = 0;
RecurIterator.CONTRACT = 1;
RecurIterator.EXPAND = 2;
RecurIterator.ILLEGAL = 3;

const DOW_MAP = {
  SU: Time.SUNDAY,
  MO: Time.MONDAY,
  TU: Time.TUESDAY,
  WE: Time.WEDNESDAY,
  TH: Time.THURSDAY,
  FR: Time.FRIDAY,
  SA: Time.SATURDAY
};
const REVERSE_DOW_MAP = {};

for (const key in DOW_MAP) {
  if (DOW_MAP.hasOwnProperty(key)) {
    REVERSE_DOW_MAP[DOW_MAP[key]] = key;
  }
}

class Recur {
  constructor(data) {
    this.parts = {};
    this.interval = 1;
    this.wkst = Time.MONDAY;
    this.icaltype = 'recur';

    if (data && typeof data === 'object') {
      this.fromData(data);
    }
  }

  iterator(aStart) {
    return new RecurIterator({
      rule: this,
      dtstart: aStart
    });
  }

  clone() {
    return new Recur(this.toJSON());
  }

  isFinite() {
    return !!(this.count || this.until);
  }

  isByCount() {
    return !!(this.count && !this.until);
  }

  addComponent(aType, aValue) {
    const ucname = aType.toUpperCase();

    if (ucname in this.parts) {
      this.parts[ucname].push(aValue);
    } else {
      this.parts[ucname] = [aValue];
    }
  }

  setComponent(aType, aValues) {
    this.parts[aType.toUpperCase()] = aValues.slice();
  }

  getComponent(aType) {
    const ucname = aType.toUpperCase();
    return ucname in this.parts ? this.parts[ucname].slice() : [];
  }

  getNextOccurrence(aStartTime, aRecurrenceId) {
    const iter = this.iterator(aStartTime);
    let next;

    do {
      next = iter.next();
    } while (next && next.compare(aRecurrenceId) <= 0);

    if (next && aRecurrenceId.zone) {
      next.zone = aRecurrenceId.zone;
    }

    return next;
  }

  fromData(data) {
    for (const key in data) {
      const uckey = key.toUpperCase();

      if (uckey in partDesign) {
        if (Array.isArray(data[key])) {
          this.parts[uckey] = data[key];
        } else {
          this.parts[uckey] = [data[key]];
        }
      } else {
        this[key] = data[key];
      }
    }

    if (this.interval && typeof this.interval !== 'number') {
      optionDesign.INTERVAL(this.interval, this);
    }

    if (this.wkst && typeof this.wkst !== 'number') {
      this.wkst = Recur.icalDayToNumericDay(this.wkst);
    }

    if (this.until && !(this.until instanceof Time)) {
      this.until = Time.fromString(this.until);
    }
  }

  toJSON() {
    const res = Object.create(null);
    res.freq = this.freq;

    if (this.count) {
      res.count = this.count;
    }

    if (this.interval > 1) {
      res.interval = this.interval;
    }

    for (const k in this.parts) {
      if (!this.parts.hasOwnProperty(k)) {
        continue;
      }

      const kparts = this.parts[k];

      if (Array.isArray(kparts) && kparts.length === 1) {
        res[k.toLowerCase()] = kparts[0];
      } else {
        res[k.toLowerCase()] = clone(this.parts[k]);
      }
    }

    if (this.until) {
      res.until = this.until.toString();
    }

    if ('wkst' in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      res.wkst = Recur.numericDayToIcalDay(this.wkst);
    }

    return res;
  }

  toString() {
    let str = 'FREQ=' + this.freq;

    if (this.count) {
      str += ';COUNT=' + this.count;
    }

    if (this.interval > 1) {
      str += ';INTERVAL=' + this.interval;
    }

    for (const k in this.parts) {
      if (this.parts.hasOwnProperty(k)) {
        str += ';' + k + '=' + this.parts[k];
      }
    }

    if (this.until) {
      str += ';UNTIL=' + this.until.toICALString();
    }

    if ('wkst' in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      str += ';WKST=' + Recur.numericDayToIcalDay(this.wkst);
    }

    return str;
  }

  static icalDayToNumericDay(string) {
    return DOW_MAP[string];
  }

  static numericDayToIcalDay(num) {
    return REVERSE_DOW_MAP[num];
  }

  static fromString(string) {
    const data = Recur._stringToData(string, false);

    return new Recur(data);
  }

  static fromData(aData) {
    return new Recur(aData);
  }

  static _stringToData(string, fmtIcal) {
    const dict = Object.create(null);
    const values = string.split(';');
    const len = values.length;

    for (let i = 0; i < len; i++) {
      const parts = values[i].split('=');
      const ucname = parts[0].toUpperCase();
      const lcname = parts[0].toLowerCase();
      const name = fmtIcal ? lcname : ucname;
      const value = parts[1];

      if (ucname in partDesign) {
        const partArr = value.split(',');
        let partArrIdx = 0;
        const partArrLen = partArr.length;

        for (; partArrIdx < partArrLen; partArrIdx++) {
          partArr[partArrIdx] = partDesign[ucname](partArr[partArrIdx]);
        }

        dict[name] = partArr.length === 1 ? partArr[0] : partArr;
      } else if (ucname in optionDesign) {
        optionDesign[ucname](value, dict, fmtIcal);
      } else {
        dict[lcname] = value;
      }
    }

    return dict;
  }

}

const parseNumericValue = (type, min, max) => value => {
  let result = value;

  if (value[0] === '+') {
    result = value.substr(1);
  }

  result = strictParseInt(result);

  if (min !== undefined && value < min) {
    throw new Error(type + ': invalid value "' + value + '" must be > ' + min);
  }

  if (max !== undefined && value > max) {
    throw new Error(type + ': invalid value "' + value + '" must be < ' + min);
  }

  return result;
};

const VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/;
const VALID_BYDAY_PART = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/;
exports.FrequencyValues = {
  SECONDLY: "SECONDLY",
  MINUTELY: "MINUTELY",
  HOURLY: "HOURLY",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY"
};
const ALLOWED_FREQ = [exports.FrequencyValues.SECONDLY, exports.FrequencyValues.MINUTELY, exports.FrequencyValues.HOURLY, exports.FrequencyValues.DAILY, exports.FrequencyValues.WEEKLY, exports.FrequencyValues.MONTHLY, exports.FrequencyValues.YEARLY];
const optionDesign = {
  FREQ(value, dict) {
    if (ALLOWED_FREQ.indexOf(value) !== -1) {
      dict.freq = value;
    } else {
      throw new Error('invalid frequency "' + value + '" expected: "' + ALLOWED_FREQ.join(', ') + '"');
    }
  },

  COUNT(value, dict) {
    dict.count = strictParseInt(value);
  },

  INTERVAL(value, dict) {
    dict.interval = strictParseInt(value);

    if (dict.interval < 1) {
      dict.interval = 1;
    }
  },

  UNTIL(value, dict, fmtIcal) {
    if (value.length > 10) {
      dict.until = design.icalendar.value['date-time'].fromICAL(value);
    } else {
      dict.until = design.icalendar.value.date.fromICAL(value);
    }

    if (!fmtIcal) {
      dict.until = Time.fromString(dict.until);
    }
  },

  WKST(value, dict) {
    if (VALID_DAY_NAMES.test(value)) {
      dict.wkst = Recur.icalDayToNumericDay(value);
    } else {
      throw new Error('invalid WKST value "' + value + '"');
    }
  }

};
const partDesign = {
  BYSECOND: parseNumericValue('BYSECOND', 0, 60),
  BYMINUTE: parseNumericValue('BYMINUTE', 0, 59),
  BYHOUR: parseNumericValue('BYHOUR', 0, 23),

  BYDAY(value) {
    if (VALID_BYDAY_PART.test(value)) {
      return value;
    } else {
      throw new Error('invalid BYDAY value "' + value + '"');
    }
  },

  BYMONTHDAY: parseNumericValue('BYMONTHDAY', -31, 31),
  BYYEARDAY: parseNumericValue('BYYEARDAY', -366, 366),
  BYWEEKNO: parseNumericValue('BYWEEKNO', -53, 53),
  BYMONTH: parseNumericValue('BYMONTH', 0, 12),
  BYSETPOS: parseNumericValue('BYSETPOS', -366, 366)
};

const FROM_ICAL_NEWLINE = /\\\\|\\;|\\,|\\[Nn]/g;
const TO_ICAL_NEWLINE = /\\|;|,|\n/g;
const FROM_VCARD_NEWLINE = /\\\\|\\,|\\[Nn]/g;
const TO_VCARD_NEWLINE = /\\|,|\n/g;

function createTextType(fromNewline, toNewline) {
  return {
    matches: /.*/,

    fromICAL(aValue, structuredEscape) {
      return replaceNewline(aValue, fromNewline, structuredEscape);
    },

    toICAL(aValue, structuredEscape) {
      let regEx = toNewline;
      if (structuredEscape) regEx = new RegExp(regEx.source + '|' + structuredEscape);
      return aValue.replace(regEx, str => {
        switch (str) {
          case '\\':
            return '\\\\';

          case ';':
            return '\\;';

          case ',':
            return '\\,';

          case '\n':
            return '\\n';

          default:
            return str;
        }
      });
    }

  };
}

const DEFAULT_TYPE_TEXT = {
  defaultType: 'text'
};
const DEFAULT_TYPE_TEXT_MULTI = {
  defaultType: 'text',
  multiValue: ','
};
const DEFAULT_TYPE_TEXT_STRUCTURED = {
  defaultType: 'text',
  structuredValue: ';'
};
const DEFAULT_TYPE_INTEGER = {
  defaultType: 'integer'
};
const DEFAULT_TYPE_DATETIME_DATE = {
  defaultType: 'date-time',
  allowedTypes: ['date-time', 'date']
};
const DEFAULT_TYPE_DATETIME = {
  defaultType: 'date-time'
};
const DEFAULT_TYPE_URI = {
  defaultType: 'uri'
};
const DEFAULT_TYPE_UTCOFFSET = {
  defaultType: 'utc-offset'
};
const DEFAULT_TYPE_RECUR = {
  defaultType: 'recur'
};
const DEFAULT_TYPE_DATE_ANDOR_TIME = {
  defaultType: 'date-and-or-time',
  allowedTypes: ['date-time', 'date', 'text']
};

function replaceNewlineReplace(string) {
  switch (string) {
    case '\\\\':
      return '\\';

    case '\\;':
      return ';';

    case '\\,':
      return ',';

    case '\\n':
    case '\\N':
      return '\n';

    default:
      return string;
  }
}

function replaceNewline(value, newline, structuredEscape) {
  if (value.indexOf('\\') === -1) {
    return value;
  }

  if (structuredEscape) newline = new RegExp(newline.source + '|\\\\' + structuredEscape);
  return value.replace(newline, replaceNewlineReplace);
}

const commonProperties = {
  categories: DEFAULT_TYPE_TEXT_MULTI,
  url: DEFAULT_TYPE_URI,
  version: DEFAULT_TYPE_TEXT,
  uid: DEFAULT_TYPE_TEXT
};
const commonValues = {
  boolean: {
    values: ['TRUE', 'FALSE'],

    fromICAL(aValue) {
      switch (aValue) {
        case 'TRUE':
          return true;

        case 'FALSE':
          return false;

        default:
          return false;
      }
    },

    toICAL(aValue) {
      if (aValue) {
        return 'TRUE';
      }

      return 'FALSE';
    }

  },
  float: {
    matches: /^[+-]?\d+\.\d+$/,

    fromICAL(aValue) {
      const parsed = parseFloat(aValue);

      if (Number.isNaN(parsed)) {
        return 0.0;
      }

      return parsed;
    },

    toICAL(aValue) {
      return String(aValue);
    }

  },
  integer: {
    fromICAL(aValue) {
      const parsed = parseInt(aValue);

      if (Number.isNaN(parsed)) {
        return 0;
      }

      return parsed;
    },

    toICAL(aValue) {
      return String(aValue);
    }

  },
  'utc-offset': {
    toICAL(aValue) {
      if (aValue.length < 7) {
        return aValue.substr(0, 3) + aValue.substr(4, 2);
      } else {
        return aValue.substr(0, 3) + aValue.substr(4, 2) + aValue.substr(7, 2);
      }
    },

    fromICAL(aValue) {
      if (aValue.length < 6) {
        return aValue.substr(0, 3) + ':' + aValue.substr(3, 2);
      } else {
        return aValue.substr(0, 3) + ':' + aValue.substr(3, 2) + ':' + aValue.substr(5, 2);
      }
    },

    decorate(aValue) {
      return UtcOffset.fromString(aValue);
    },

    undecorate(aValue) {
      return aValue.toString();
    }

  }
};
const icalParams = {
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
  encoding: {
    values: ['8BIT', 'BASE64']
  },
  fbtype: {
    values: ['FREE', 'BUSY', 'BUSY-UNAVAILABLE', 'BUSY-TENTATIVE'],
    allowXName: true,
    allowIanaToken: true
  },
  member: {
    valueType: 'cal-address',
    multiValue: ',',
    multiValueSeparateDQuote: true
  },
  partstat: {
    values: ['NEEDS-ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'DELEGATED', 'COMPLETED', 'IN-PROCESS'],
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
    values: ['REQ-PARTICIPANT', 'CHAIR', 'OPT-PARTICIPANT', 'NON-PARTICIPANT'],
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
    values: ['binary', 'boolean', 'cal-address', 'date', 'date-time', 'duration', 'float', 'integer', 'period', 'recur', 'text', 'time', 'uri', 'utc-offset'],
    allowXName: true,
    allowIanaToken: true
  }
};
const icalValues = Object.assign({}, commonValues, {
  text: createTextType(FROM_ICAL_NEWLINE, TO_ICAL_NEWLINE),
  uri: {},
  binary: {
    decorate(aString) {
      return Binary.fromString(aString);
    },

    undecorate(aBinary) {
      return aBinary.toString();
    }

  },
  'cal-address': {},
  date: {
    decorate(aValue) {
      return Time.fromDateString(aValue);
    },

    undecorate(aValue) {
      return aValue.toString();
    },

    fromICAL(aValue) {
      return aValue.substr(0, 4) + '-' + aValue.substr(4, 2) + '-' + aValue.substr(6, 2);
    },

    toICAL(aValue) {
      if (aValue.length > 11) {
        return aValue;
      }

      return aValue.substr(0, 4) + aValue.substr(5, 2) + aValue.substr(8, 2);
    }

  },
  'date-time': {
    fromICAL(aValue) {
      let result = aValue.substr(0, 4) + '-' + aValue.substr(4, 2) + '-' + aValue.substr(6, 2) + 'T' + aValue.substr(9, 2) + ':' + aValue.substr(11, 2) + ':' + aValue.substr(13, 2);

      if (aValue[15] && aValue[15] === 'Z') {
        result += 'Z';
      }

      return result;
    },

    toICAL(aValue) {
      if (aValue.length < 19) {
        return aValue;
      }

      let result = aValue.substr(0, 4) + aValue.substr(5, 2) + aValue.substr(8, 5) + aValue.substr(14, 2) + aValue.substr(17, 2);

      if (aValue[19] && aValue[19] === 'Z') {
        result += 'Z';
      }

      return result;
    },

    decorate(aValue, aProp) {
      return Time.fromDateTimeString(aValue, aProp);
    },

    undecorate(aValue) {
      return aValue.toString();
    }

  },
  duration: {
    decorate(aValue) {
      return Duration.fromString(aValue);
    },

    undecorate(aValue) {
      return aValue.toString();
    }

  },
  period: {
    fromICAL(string) {
      const parts = string.split('/');
      parts[0] = icalValues['date-time'].fromICAL(parts[0]);

      if (!Duration.isValueString(parts[1])) {
        parts[1] = icalValues['date-time'].fromICAL(parts[1]);
      }

      return parts;
    },

    toICAL(parts) {
      parts[0] = icalValues['date-time'].toICAL(parts[0]);

      if (!Duration.isValueString(parts[1])) {
        parts[1] = icalValues['date-time'].toICAL(parts[1]);
      }

      return parts.join('/');
    },

    decorate(aValue, aProp) {
      return Period.fromJSON(aValue, aProp);
    },

    undecorate(aValue) {
      return aValue.toJSON();
    }

  },
  recur: {
    fromICAL(string) {
      return Recur._stringToData(string, true);
    },

    toICAL(data) {
      let str = '';

      for (const k in data) {
        if (!Object.prototype.hasOwnProperty.call(data, k)) {
          continue;
        }

        let val = data[k];

        if (k === 'until') {
          if (val.length > 10) {
            val = icalValues['date-time'].toICAL(val);
          } else {
            val = icalValues.date.toICAL(val);
          }
        } else if (k === 'wkst') {
          if (typeof val === 'number') {
            val = Recur.numericDayToIcalDay(val);
          }
        } else if (Array.isArray(val)) {
          val = val.join(',');
        }

        str += k.toUpperCase() + '=' + val + ';';
      }

      return str.substr(0, str.length - 1);
    },

    decorate(aValue) {
      return Recur.fromData(aValue);
    },

    undecorate(aRecur) {
      return aRecur.toJSON();
    }

  },
  time: {
    fromICAL(aValue) {
      if (aValue.length < 6) {
        return aValue;
      }

      let result = aValue.substr(0, 2) + ':' + aValue.substr(2, 2) + ':' + aValue.substr(4, 2);

      if (aValue[6] === 'Z') {
        result += 'Z';
      }

      return result;
    },

    toICAL(aValue) {
      if (aValue.length < 8) {
        return aValue;
      }

      let result = aValue.substr(0, 2) + aValue.substr(3, 2) + aValue.substr(6, 2);

      if (aValue[8] === 'Z') {
        result += 'Z';
      }

      return result;
    }

  }
});
const icalProperties = Object.assign({}, commonProperties, {
  action: DEFAULT_TYPE_TEXT,
  attach: {
    defaultType: 'uri'
  },
  attendee: {
    defaultType: 'cal-address'
  },
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
  duration: {
    defaultType: 'duration'
  },
  exdate: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date'],
    multiValue: ','
  },
  exrule: DEFAULT_TYPE_RECUR,
  freebusy: {
    defaultType: 'period',
    multiValue: ','
  },
  geo: {
    defaultType: 'float',
    structuredValue: ';'
  },
  'last-modified': DEFAULT_TYPE_DATETIME,
  location: DEFAULT_TYPE_TEXT,
  method: DEFAULT_TYPE_TEXT,
  organizer: {
    defaultType: 'cal-address'
  },
  'percent-complete': DEFAULT_TYPE_INTEGER,
  priority: DEFAULT_TYPE_INTEGER,
  prodid: DEFAULT_TYPE_TEXT,
  'related-to': DEFAULT_TYPE_TEXT,
  repeat: DEFAULT_TYPE_INTEGER,
  rdate: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date', 'period'],
    multiValue: ',',

    detectType(string) {
      if (string.indexOf('/') !== -1) {
        return 'period';
      }

      return string.indexOf('T') === -1 ? 'date' : 'date-time';
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
  trigger: {
    defaultType: 'duration',
    allowedTypes: ['duration', 'date-time']
  },
  tzoffsetfrom: DEFAULT_TYPE_UTCOFFSET,
  tzoffsetto: DEFAULT_TYPE_UTCOFFSET,
  tzurl: DEFAULT_TYPE_URI,
  tzid: DEFAULT_TYPE_TEXT,
  tzname: DEFAULT_TYPE_TEXT
});
const vcardValues = Object.assign({}, commonValues, {
  text: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
  uri: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
  date: {
    decorate(aValue) {
      return VCardTime.fromDateAndOrTimeString(aValue, 'date');
    },

    undecorate(aValue) {
      return aValue.toString();
    },

    fromICAL(aValue) {
      if (aValue.length === 8) {
        return icalValues.date.fromICAL(aValue);
      } else if (aValue[0] === '-' && aValue.length === 6) {
        return aValue.substr(0, 4) + '-' + aValue.substr(4);
      } else {
        return aValue;
      }
    },

    toICAL(aValue) {
      if (aValue.length === 10) {
        return icalValues.date.toICAL(aValue);
      } else if (aValue[0] === '-' && aValue.length === 7) {
        return aValue.substr(0, 4) + aValue.substr(5);
      } else {
        return aValue;
      }
    }

  },
  time: {
    decorate(aValue) {
      return VCardTime.fromDateAndOrTimeString('T' + aValue, 'time');
    },

    undecorate(aValue) {
      return aValue.toString();
    },

    fromICAL(aValue) {
      const splitzone = vcardValues.time._splitZone(aValue, true);

      let zone = splitzone[0],
          value = splitzone[1];

      if (value.length === 6) {
        value = value.substr(0, 2) + ':' + value.substr(2, 2) + ':' + value.substr(4, 2);
      } else if (value.length === 4 && value[0] !== '-') {
        value = value.substr(0, 2) + ':' + value.substr(2, 2);
      } else if (value.length === 5) {
        value = value.substr(0, 3) + ':' + value.substr(3, 2);
      }

      if (zone.length === 5 && (zone[0] === '-' || zone[0] === '+')) {
        zone = zone.substr(0, 3) + ':' + zone.substr(3);
      }

      return value + zone;
    },

    toICAL(aValue) {
      const splitzone = vcardValues.time._splitZone(aValue);

      let zone = splitzone[0],
          value = splitzone[1];

      if (value.length === 8) {
        value = value.substr(0, 2) + value.substr(3, 2) + value.substr(6, 2);
      } else if (value.length === 5 && value[0] !== '-') {
        value = value.substr(0, 2) + value.substr(3, 2);
      } else if (value.length === 6) {
        value = value.substr(0, 3) + value.substr(4, 2);
      }

      if (zone.length === 6 && (zone[0] === '-' || zone[0] === '+')) {
        zone = zone.substr(0, 3) + zone.substr(4);
      }

      return value + zone;
    },

    _splitZone(aValue, isFromIcal) {
      const lastChar = aValue.length - 1;
      const signChar = aValue.length - (isFromIcal ? 5 : 6);
      const sign = aValue[signChar];
      let zone, value;

      if (aValue[lastChar] === 'Z') {
        zone = aValue[lastChar];
        value = aValue.substr(0, lastChar);
      } else if (aValue.length > 6 && (sign === '-' || sign === '+')) {
        zone = aValue.substr(signChar);
        value = aValue.substr(0, signChar);
      } else {
        zone = '';
        value = aValue;
      }

      return [zone, value];
    }

  },
  'date-time': {
    decorate(aValue) {
      return VCardTime.fromDateAndOrTimeString(aValue, 'date-time');
    },

    undecorate(aValue) {
      return aValue.toString();
    },

    fromICAL(aValue) {
      return vcardValues['date-and-or-time'].fromICAL(aValue);
    },

    toICAL(aValue) {
      return vcardValues['date-and-or-time'].toICAL(aValue);
    }

  },
  'date-and-or-time': {
    decorate(aValue) {
      return VCardTime.fromDateAndOrTimeString(aValue, 'date-and-or-time');
    },

    undecorate(aValue) {
      return aValue.toString();
    },

    fromICAL(aValue) {
      const parts = aValue.split('T');
      return (parts[0] ? vcardValues.date.fromICAL(parts[0]) : '') + (parts[1] ? 'T' + vcardValues.time.fromICAL(parts[1]) : '');
    },

    toICAL(aValue) {
      const parts = aValue.split('T');
      return vcardValues.date.toICAL(parts[0]) + (parts[1] ? 'T' + vcardValues.time.toICAL(parts[1]) : '');
    }

  },
  timestamp: icalValues['date-time'],
  'language-tag': {
    matches: /^[a-zA-Z0-9-]+$/
  }
});
const vcardParams = {
  type: {
    valueType: 'text',
    multiValue: ','
  },
  value: {
    values: ['text', 'uri', 'date', 'time', 'date-time', 'date-and-or-time', 'timestamp', 'boolean', 'integer', 'float', 'utc-offset', 'language-tag'],
    allowXName: true,
    allowIanaToken: true
  }
};
const vcardProperties = Object.assign({}, commonProperties, {
  adr: {
    defaultType: 'text',
    structuredValue: ';',
    multiValue: ','
  },
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
  lang: {
    defaultType: 'language-tag'
  },
  logo: DEFAULT_TYPE_URI,
  member: DEFAULT_TYPE_URI,
  n: {
    defaultType: 'text',
    structuredValue: ';',
    multiValue: ','
  },
  nickname: DEFAULT_TYPE_TEXT_MULTI,
  note: DEFAULT_TYPE_TEXT,
  org: {
    defaultType: 'text',
    structuredValue: ';'
  },
  photo: DEFAULT_TYPE_URI,
  related: DEFAULT_TYPE_URI,
  rev: {
    defaultType: 'timestamp'
  },
  role: DEFAULT_TYPE_TEXT,
  sound: DEFAULT_TYPE_URI,
  source: DEFAULT_TYPE_URI,
  tel: {
    defaultType: 'uri',
    allowedTypes: ['uri', 'text']
  },
  title: DEFAULT_TYPE_TEXT,
  tz: {
    defaultType: 'text',
    allowedTypes: ['text', 'utc-offset', 'uri']
  },
  xml: DEFAULT_TYPE_TEXT
});
const vcard3Values = Object.assign({}, commonValues, {
  binary: icalValues.binary,
  date: vcardValues.date,
  'date-time': vcardValues['date-time'],
  'phone-number': {},
  uri: icalValues.uri,
  text: icalValues.text,
  time: icalValues.time,
  vcard: icalValues.text,
  'utc-offset': {
    toICAL(aValue) {
      return aValue.substr(0, 7);
    },

    fromICAL(aValue) {
      return aValue.substr(0, 7);
    },

    decorate(aValue) {
      return UtcOffset.fromString(aValue);
    },

    undecorate(aValue) {
      return aValue.toString();
    }

  }
});
const vcard3Params = {
  type: {
    valueType: 'text',
    multiValue: ','
  },
  value: {
    values: ['text', 'uri', 'date', 'date-time', 'phone-number', 'time', 'boolean', 'integer', 'float', 'utc-offset', 'vcard', 'binary'],
    allowXName: true,
    allowIanaToken: true
  }
};
const vcard3Properties = Object.assign({}, commonProperties, {
  fn: DEFAULT_TYPE_TEXT,
  n: {
    defaultType: 'text',
    structuredValue: ';',
    multiValue: ','
  },
  nickname: DEFAULT_TYPE_TEXT_MULTI,
  photo: {
    defaultType: 'binary',
    allowedTypes: ['binary', 'uri']
  },
  bday: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date'],

    detectType(string) {
      return string.indexOf('T') === -1 ? 'date' : 'date-time';
    }

  },
  adr: {
    defaultType: 'text',
    structuredValue: ';',
    multiValue: ','
  },
  label: DEFAULT_TYPE_TEXT,
  tel: {
    defaultType: 'phone-number'
  },
  email: DEFAULT_TYPE_TEXT,
  mailer: DEFAULT_TYPE_TEXT,
  tz: {
    defaultType: 'utc-offset',
    allowedTypes: ['utc-offset', 'text']
  },
  geo: {
    defaultType: 'float',
    structuredValue: ';'
  },
  title: DEFAULT_TYPE_TEXT,
  role: DEFAULT_TYPE_TEXT,
  logo: {
    defaultType: 'binary',
    allowedTypes: ['binary', 'uri']
  },
  agent: {
    defaultType: 'vcard',
    allowedTypes: ['vcard', 'text', 'uri']
  },
  org: DEFAULT_TYPE_TEXT_STRUCTURED,
  note: DEFAULT_TYPE_TEXT_MULTI,
  prodid: DEFAULT_TYPE_TEXT,
  rev: {
    defaultType: 'date-time',
    allowedTypes: ['date-time', 'date'],

    detectType(string) {
      return string.indexOf('T') === -1 ? 'date' : 'date-time';
    }

  },
  'sort-string': DEFAULT_TYPE_TEXT,
  sound: {
    defaultType: 'binary',
    allowedTypes: ['binary', 'uri']
  },
  class: DEFAULT_TYPE_TEXT,
  key: {
    defaultType: 'binary',
    allowedTypes: ['binary', 'text']
  }
});
const icalSet = {
  value: icalValues,
  param: icalParams,
  property: icalProperties
};
const vcardSet = {
  value: vcardValues,
  param: vcardParams,
  property: vcardProperties
};
const vcard3Set = {
  value: vcard3Values,
  param: vcard3Params,
  property: vcard3Properties
};
let design = {
  defaultSet: icalSet,
  defaultType: 'unknown',
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
  icalendar: icalSet,
  vcard: vcardSet,
  vcard3: vcard3Set,

  getDesignSet(componentName) {
    const isInDesign = componentName && componentName in design.components;
    return isInDesign ? design.components[componentName] : design.defaultSet;
  }

};

const LINE_ENDING = '\r\n';
const DEFAULT_VALUE_TYPE$1 = 'unknown';
function stringify(jCal) {
  if (typeof jCal[0] === 'string') {
    jCal = [jCal];
  }

  let i = 0;
  const len = jCal.length;
  let result = '';

  for (; i < len; i++) {
    result += stringify.component(jCal[i]) + LINE_ENDING;
  }

  return result;
}

stringify.component = function (component, designSet) {
  const name = component[0].toUpperCase();
  let result = 'BEGIN:' + name + LINE_ENDING;
  const props = component[1];
  let propIdx = 0;
  const propLen = props.length;
  let designSetName = component[0];

  if (designSetName === 'vcard' && component[1].length > 0 && !(component[1][0][0] === 'version' && component[1][0][3] === '4.0')) {
    designSetName = 'vcard3';
  }

  designSet = designSet || design.getDesignSet(designSetName);

  for (; propIdx < propLen; propIdx++) {
    result += stringify.property(props[propIdx], designSet) + LINE_ENDING;
  }

  const comps = component[2] || [];
  let compIdx = 0;
  const compLen = comps.length;

  for (; compIdx < compLen; compIdx++) {
    result += stringify.component(comps[compIdx], designSet) + LINE_ENDING;
  }

  result += 'END:' + name;
  return result;
};

stringify.property = function (property, designSet, noFold) {
  const name = property[0].toUpperCase();
  const jsName = property[0];
  const params = property[1];
  let line = name;

  for (const paramName in params) {
    let value = params[paramName];

    if (params.hasOwnProperty(paramName)) {
      let multiValue = designSet && paramName in designSet.param && designSet.param[paramName].multiValue;

      if (multiValue && Array.isArray(value)) {
        if (designSet.param[paramName].multiValueSeparateDQuote) {
          multiValue = '"' + multiValue + '"';
        }

        value = value.map(stringify._rfc6868Unescape);
        value = stringify.multiValue(value, multiValue, 'unknown', null, designSet);
      } else {
        value = stringify._rfc6868Unescape(value);
      }

      line += ';' + paramName.toUpperCase();
      line += '=' + stringify.propertyValue(value);
    }
  }

  if (property.length === 3) {
    return line + ':';
  }

  const valueType = property[2];

  if (!designSet) {
    designSet = design.defaultSet;
  }

  let propDetails;
  let multiValue;
  let structuredValue = '';
  let isDefault = false;

  if (jsName in designSet.property) {
    propDetails = designSet.property[jsName];

    if ('multiValue' in propDetails) {
      multiValue = propDetails.multiValue;
    }

    if ('structuredValue' in propDetails && Array.isArray(property[3])) {
      structuredValue = propDetails.structuredValue;
    }

    if ('defaultType' in propDetails) {
      if (valueType === propDetails.defaultType) {
        isDefault = true;
      }
    } else {
      if (valueType === DEFAULT_VALUE_TYPE$1) {
        isDefault = true;
      }
    }
  } else {
    if (valueType === DEFAULT_VALUE_TYPE$1) {
      isDefault = true;
    }
  }

  if (!isDefault) {
    line += ';VALUE=' + valueType.toUpperCase();
  }

  line += ':';

  if (multiValue && structuredValue) {
    line += stringify.multiValue(property[3], structuredValue, valueType, multiValue, designSet, structuredValue);
  } else if (multiValue) {
    line += stringify.multiValue(property.slice(3), multiValue, valueType, null, designSet);
  } else if (structuredValue) {
    line += stringify.multiValue(property[3], structuredValue, valueType, null, designSet, structuredValue);
  } else {
    line += stringify.value(property[3], valueType, designSet);
  }

  return noFold ? line : foldline(line);
};

stringify.propertyValue = function (value) {
  if (unescapedIndexOf(value, ',') === -1 && unescapedIndexOf(value, ':') === -1 && unescapedIndexOf(value, ';') === -1) {
    return value;
  }

  return '"' + value + '"';
};

stringify.multiValue = function multiValue(values, delim, type, innerMulti, designSet, structuredValue) {
  let result = '';
  const len = values.length;
  let i = 0;

  for (; i < len; i++) {
    if (innerMulti && Array.isArray(values[i])) {
      result += stringify.multiValue(values[i], innerMulti, type, null, designSet, structuredValue);
    } else {
      result += stringify.value(values[i], type, designSet, structuredValue);
    }

    if (i !== len - 1) {
      result += delim;
    }
  }

  return result;
};

stringify.value = function (value, type, designSet, structuredValue) {
  if (type in designSet.value && 'toICAL' in designSet.value[type]) {
    return designSet.value[type].toICAL(value, structuredValue);
  }

  return String(value);
};

stringify._rfc6868Unescape = function (val) {
  return val.replace(/[\n^"]/g, function (x) {
    return RFC6868_REPLACE_MAP$1[x];
  });
};

const RFC6868_REPLACE_MAP$1 = {
  '"': "^'",
  '\n': '^n',
  '^': '^^'
};

var Index = {
  Name: 0,
  Prop: 1,
  Type: 2,
  Value: 3
};
class Property {
  constructor(jCal, parent) {
    this._parent = parent;

    if (typeof jCal === 'string') {
      this.jCal = [jCal, {}, design.defaultType];
      this.jCal[Index.Type] = this.getDefaultType();
    } else {
      this.jCal = [...jCal];
    }

    this._updateType();
  }

  get type() {
    return this.jCal[Index.Type];
  }

  get name() {
    return this.jCal[Index.Name];
  }

  get parent() {
    return this._parent;
  }

  set parent(p) {
    const designSetChanged = !this._parent || p && p._designSet !== this._parent._designSet;
    this._parent = p;

    if (this.type === design.defaultType && designSetChanged) {
      this.jCal[Index.Type] = this.getDefaultType();

      this._updateType();
    }
  }

  get _designSet() {
    return this.parent ? this.parent._designSet : design.defaultSet;
  }

  _updateType() {
    const designSet = this._designSet;

    if (this.type in designSet.value) {
      if ('decorate' in designSet.value[this.type]) {
        this.isDecorated = true;
      } else {
        this.isDecorated = false;
      }

      if (this.name in designSet.property) {
        this.isMultiValue = 'multiValue' in designSet.property[this.name];
        this.isStructuredValue = 'structuredValue' in designSet.property[this.name];
      }
    }
  }

  _hydrateValue(index) {
    if (this._values && this._values[index]) {
      return this._values[index];
    }

    if (this.jCal.length <= Index.Value + index) {
      return;
    }

    if (this.isDecorated) {
      if (!this._values) {
        this._values = [];
      }

      this._values[index] = this._decorate(this.jCal[Index.Value + index]);
      return this._values[index];
    } else {
      return this.jCal[Index.Value + index];
    }
  }

  _decorate(value) {
    return this._designSet.value[this.type].decorate(value, this);
  }

  _undecorate(value) {
    return this._designSet.value[this.type].undecorate(value, this);
  }

  _setDecoratedValue(value, index) {
    if (!this._values) {
      this._values = [];
    }

    if (typeof value === 'object' && 'icaltype' in value) {
      this.jCal[Index.Value + index] = this._undecorate(value);
      this._values[index] = value;
    } else {
      this.jCal[Index.Value + index] = value;
      this._values[index] = this._decorate(value);
    }
  }

  getParameter(name) {
    if (name in this.jCal[Index.Prop]) {
      return this.jCal[Index.Prop][name];
    }
  }

  getFirstParameter(name) {
    const parameters = this.getParameter(name);

    if (Array.isArray(parameters)) {
      return parameters[0];
    }

    return parameters;
  }

  setParameter(name, value) {
    const lcname = name.toLowerCase();

    if (typeof value === 'string' && lcname in this._designSet.param && 'multiValue' in this._designSet.param[lcname]) {
      value = [value];
    }

    this.jCal[Index.Prop][name] = value;
  }

  removeParameter(name) {
    delete this.jCal[Index.Prop][name];
  }

  getDefaultType() {
    const name = this.jCal[Index.Name];
    const designSet = this._designSet;

    if (name in designSet.property) {
      const details = designSet.property[name];

      if ('defaultType' in details) {
        return details.defaultType;
      }
    }

    return design.defaultType;
  }

  resetType(type) {
    this.removeAllValues();
    this.jCal[Index.Type] = type;

    this._updateType();
  }

  getFirstValue() {
    return this._hydrateValue(0);
  }

  getValues() {
    const len = this.jCal.length - Index.Value;

    if (len < 1) {
      return [];
    }

    let i = 0;
    const result = [];

    for (; i < len; i++) {
      result[i] = this._hydrateValue(i);
    }

    return result;
  }

  removeAllValues() {
    if (this._values) {
      this._values.length = 0;
    }

    this.jCal.length = 3;
  }

  setValues(values) {
    if (!this.isMultiValue) {
      throw new Error(`${this.name}: does not not support mulitValue.\noverride isMultiValue`);
    }

    const len = values.length;
    let i = 0;
    this.removeAllValues();

    if (len > 0 && typeof values[0] === 'object' && 'icaltype' in values[0]) {
      this.resetType(values[0].icaltype);
    }

    if (this.isDecorated) {
      for (; i < len; i++) {
        this._setDecoratedValue(values[i], i);
      }
    } else {
      for (; i < len; i++) {
        this.jCal[Index.Value + i] = values[i];
      }
    }
  }

  setValue(value) {
    this.removeAllValues();

    if (typeof value === 'object' && 'icaltype' in value) {
      this.resetType(value.icaltype);
    }

    if (this.isDecorated) {
      this._setDecoratedValue(value, 0);
    } else {
      this.jCal[Index.Value] = value;
    }
  }

  toJSON() {
    return this.jCal;
  }

  toICALString() {
    return stringify.property(this.jCal, this._designSet, true);
  }

  static fromString(str, designSet) {
    return new Property(parse.property(str, designSet));
  }

}

const PROPERTY_INDEX = 1;
const COMPONENT_INDEX = 2;
const NAME_INDEX = 0;
class Component {
  constructor(jCal, parent) {
    this._components = [];
    this._properties = [];
    this._hydratedPropertyCount = 0;
    this._hydratedComponentCount = 0;

    if (typeof jCal === 'string') {
      jCal = [jCal, [], []];
    }

    this.jCal = jCal;
    this.parent = parent;
  }

  get name() {
    return this.jCal[NAME_INDEX];
  }

  get _designSet() {
    const parentDesign = this.parent && this.parent._designSet;
    return parentDesign || design.getDesignSet(this.name);
  }

  _hydrateComponent(index) {
    if (!this._components) {
      this._components = [];
      this._hydratedComponentCount = 0;
    }

    if (this._components[index]) {
      return this._components[index];
    }

    const comp = new Component(this.jCal[COMPONENT_INDEX][index], this);
    this._hydratedComponentCount++;
    return this._components[index] = comp;
  }

  _hydrateProperty(index) {
    if (this._properties[index]) {
      return this._properties[index];
    }

    const prop = new Property(this.jCal[PROPERTY_INDEX][index], this);
    this._hydratedPropertyCount++;
    return this._properties[index] = prop;
  }

  getFirstSubcomponent(name) {
    if (name) {
      const comps = this.jCal[COMPONENT_INDEX];

      for (let i = 0; i < comps.length; i++) {
        if (comps[i][NAME_INDEX] === name) {
          return this._hydrateComponent(i);
        }
      }
    } else {
      if (this.jCal[COMPONENT_INDEX].length) {
        return this._hydrateComponent(0);
      }
    }
  }

  getAllSubcomponents(name) {
    const jCalLen = this.jCal[COMPONENT_INDEX].length;

    if (name) {
      const comps = this.jCal[COMPONENT_INDEX];
      const result = [];

      for (let i = 0; i < jCalLen; i++) {
        if (name === comps[i][NAME_INDEX]) {
          result.push(this._hydrateComponent(i));
        }
      }

      return result;
    } else {
      if (!this._components || this._hydratedComponentCount !== jCalLen) {
        for (let i = 0; i < jCalLen; i++) {
          this._hydrateComponent(i);
        }
      }

      return this._components;
    }
  }

  hasProperty(name) {
    const props = this.jCal[PROPERTY_INDEX];

    for (let i = 0; i < props.length; i++) {
      if (props[i][NAME_INDEX] === name) {
        return true;
      }
    }

    return false;
  }

  getFirstProperty(name) {
    if (name) {
      const props = this.jCal[PROPERTY_INDEX];

      for (let i = 0; i < props.length; i++) {
        if (props[i][NAME_INDEX] === name) {
          return this._hydrateProperty(i);
        }
      }
    } else {
      if (this.jCal[PROPERTY_INDEX].length) {
        return this._hydrateProperty(0);
      }
    }
  }

  getFirstPropertyValue(name) {
    const prop = this.getFirstProperty(name);

    if (prop) {
      return prop.getFirstValue();
    }
  }

  getAllProperties(name) {
    const jCalLen = this.jCal[PROPERTY_INDEX].length;

    if (name) {
      const props = this.jCal[PROPERTY_INDEX];
      const result = [];

      for (let i = 0; i < jCalLen; i++) {
        if (name === props[i][NAME_INDEX]) {
          result.push(this._hydrateProperty(i));
        }
      }

      return result;
    } else {
      if (!this._properties || this._hydratedPropertyCount !== jCalLen) {
        for (let i = 0; i < jCalLen; i++) {
          this._hydrateProperty(i);
        }
      }

      return this._properties;
    }
  }

  _removeObjectByIndex(jCalIndex, cache = [], index) {
    if (cache[index]) {
      const obj = cache[index];

      if ('parent' in obj) {
        obj.parent = undefined;
      }
    }

    cache.splice(index, 1);
    this.jCal[jCalIndex].splice(index, 1);
  }

  _removeObject(jCalIndex, cache, nameOrObject) {
    const objects = this.jCal[jCalIndex];
    const cached = this[cache];

    if (typeof nameOrObject === 'string') {
      for (let i = 0; i < objects.length; i++) {
        if (objects[i][NAME_INDEX] === nameOrObject) {
          this._removeObjectByIndex(jCalIndex, cached, i);

          return true;
        }
      }
    } else if (cached) {
      for (let i = 0; i < objects.length; i++) {
        if (cached[i] && cached[i] === nameOrObject) {
          this._removeObjectByIndex(jCalIndex, cached, i);

          return true;
        }
      }
    }

    return false;
  }

  _removeAllObjects(jCalIndex, cache, name) {
    const cached = this[cache];
    const objects = this.jCal[jCalIndex];
    let removed = false;

    for (let i = objects.length - 1; i >= 0; i--) {
      if (!name || objects[i][NAME_INDEX] === name) {
        this._removeObjectByIndex(jCalIndex, cached, i);

        removed = true;
      }
    }

    return removed;
  }

  addSubcomponent(component) {
    if (!this._components) {
      this._components = [];
      this._hydratedComponentCount = 0;
    }

    if (component.parent) {
      component.parent.removeSubcomponent(component);
    }

    const idx = this.jCal[COMPONENT_INDEX].push(component.jCal);
    this._components[idx - 1] = component;
    this._hydratedComponentCount++;
    component.parent = this;
    return component;
  }

  removeSubcomponent(nameOrComp) {
    const removed = this._removeObject(COMPONENT_INDEX, '_components', nameOrComp);

    if (removed) {
      this._hydratedComponentCount--;
    }

    return removed;
  }

  removeAllSubcomponents(name) {
    const removed = this._removeAllObjects(COMPONENT_INDEX, '_components', name);

    this._hydratedComponentCount = 0;
    return removed;
  }

  addProperty(property) {
    if (!(property instanceof Property)) {
      throw TypeError('must instance of ICAL.Property');
    }

    if (!this._properties) {
      this._properties = [];
      this._hydratedPropertyCount = 0;
    }

    if (property.parent) {
      property.parent.removeProperty(property);
    }

    const idx = this.jCal[PROPERTY_INDEX].push(property.jCal);
    this._properties[idx - 1] = property;
    this._hydratedPropertyCount++;
    property.parent = this;
    return property;
  }

  addPropertyWithValue(name, value) {
    const prop = new Property(name);
    prop.setValue(value);
    this.addProperty(prop);
    return prop;
  }

  updatePropertyWithValue(name, value) {
    let prop = this.getFirstProperty(name);

    if (prop) {
      prop.setValue(value);
    } else {
      prop = this.addPropertyWithValue(name, value);
    }

    return prop;
  }

  removeProperty(nameOrProp) {
    const removed = this._removeObject(PROPERTY_INDEX, '_properties', nameOrProp);

    if (removed) {
      this._hydratedPropertyCount--;
    }

    return removed;
  }

  removeAllProperties(name) {
    const removed = this._removeAllObjects(PROPERTY_INDEX, '_properties', name);

    this._hydratedPropertyCount = 0;
    return removed;
  }

  toJSON() {
    return this.jCal;
  }

  toString() {
    return stringify.component(this.jCal, this._designSet);
  }

  static fromString(str) {
    return new Component(parse.component(str));
  }

}

function formatTime(item) {
  return formatClassType(item, Time);
}

function compareTime(a, b) {
  return a.compare(b);
}

function isRecurringComponent(comp) {
  return comp.hasProperty('rdate') || comp.hasProperty('rrule') || comp.hasProperty('recurrence-id');
}

class RecurExpansion {
  constructor(options) {
    this.complete = false;
    this.ruleDates = [];
    this.exDates = [];
    this.ruleDateInc = 0;
    this.exDateInc = 0;
    this.fromData(options);
  }

  fromData(options) {
    const start = formatClassType(options.dtstart, Time);

    if (!start) {
      throw new Error('.dtstart (Time) must be given');
    } else {
      this.dtstart = start;
    }

    if (options.component) {
      this._init(options.component);
    } else {
      this.last = formatTime(options.last) || start.clone();

      if (!options.ruleIterators) {
        throw new Error('.ruleIterators or .component must be given');
      }

      this.ruleIterators = options.ruleIterators.map(item => formatClassType(item, RecurIterator));
      this.ruleDateInc = options.ruleDateInc;
      this.exDateInc = options.exDateInc;

      if (options.ruleDates) {
        this.ruleDates = options.ruleDates.map(formatTime);
        this.ruleDate = this.ruleDates[this.ruleDateInc];
      }

      if (options.exDates) {
        this.exDates = options.exDates.map(formatTime);
        this.exDate = this.exDates[this.exDateInc];
      }

      if (typeof options.complete !== 'undefined') {
        this.complete = options.complete;
      }
    }
  }

  next() {
    let iter;
    let next;
    let compare;
    const maxTries = 500;
    let currentTry = 0;

    while (true) {
      if (currentTry++ > maxTries) {
        throw new Error('max tries have occured, rule may be impossible to forfill.');
      }

      next = this.ruleDate;
      iter = this._nextRecurrenceIter();

      if (!next && !iter) {
        this.complete = true;
        break;
      }

      if (!next || iter && next.compare(iter.last) > 0) {
        next = iter.last.clone();
        iter.next();
      }

      if (this.ruleDate === next) {
        this._nextRuleDay();
      }

      this.last = next;

      if (this.exDate) {
        compare = this.exDate.compare(this.last);

        if (compare < 0) {
          this._nextExDay();
        }

        if (compare === 0) {
          this._nextExDay();

          continue;
        }
      }

      return this.last;
    }

    return this.last;
  }

  toJSON() {
    function toJSON(item) {
      return item.toJSON();
    }

    const result = Object.create(null);
    result.ruleIterators = this.ruleIterators.map(toJSON);

    if (this.ruleDates) {
      result.ruleDates = this.ruleDates.map(toJSON);
    }

    if (this.exDates) {
      result.exDates = this.exDates.map(toJSON);
    }

    result.ruleDateInc = this.ruleDateInc;
    result.exDateInc = this.exDateInc;
    result.last = this.last.toJSON();
    result.dtstart = this.dtstart.toJSON();
    result.complete = this.complete;
    return result;
  }

  _extractDates(component, propertyName) {
    function handleProp(prop) {
      idx = binsearchInsert(result, prop, compareTime);
      result.splice(idx, 0, prop);
    }

    const result = [];
    const props = component.getAllProperties(propertyName);
    const len = props.length;
    let i = 0;
    let idx;

    for (; i < len; i++) {
      props[i].getValues().forEach(handleProp);
    }

    return result;
  }

  _init(component) {
    this.ruleIterators = [];
    this.last = this.dtstart.clone();

    if (!isRecurringComponent(component)) {
      this.ruleDate = this.last.clone();
      this.complete = true;
      return;
    }

    if (component.hasProperty('rdate')) {
      this.ruleDates = this._extractDates(component, 'rdate');

      if (this.ruleDates[0] && this.ruleDates[0].compare(this.dtstart) < 0) {
        this.ruleDateInc = 0;
        this.last = this.ruleDates[0].clone();
      } else {
        this.ruleDateInc = binsearchInsert(this.ruleDates, this.last, compareTime);
      }

      this.ruleDate = this.ruleDates[this.ruleDateInc];
    }

    if (component.hasProperty('rrule')) {
      const rules = component.getAllProperties('rrule');
      let i = 0;
      const len = rules.length;
      let rule;
      let iter;

      for (; i < len; i++) {
        rule = rules[i].getFirstValue();
        iter = rule.iterator(this.dtstart);
        this.ruleIterators.push(iter);
        iter.next();
      }
    }

    if (component.hasProperty('exdate')) {
      this.exDates = this._extractDates(component, 'exdate');
      this.exDateInc = binsearchInsert(this.exDates, this.last, compareTime);
      this.exDate = this.exDates[this.exDateInc];
    }
  }

  _nextExDay() {
    this.exDate = this.exDates[++this.exDateInc];
  }

  _nextRuleDay() {
    this.ruleDate = this.ruleDates[++this.ruleDateInc];
  }

  _nextRecurrenceIter() {
    const iters = this.ruleIterators;

    if (iters.length === 0) {
      return;
    }

    let len = iters.length;
    let iter;
    let iterTime;
    let iterIdx = 0;
    let chosenIter;

    for (; iterIdx < len; iterIdx++) {
      iter = iters[iterIdx];
      iterTime = iter.last;

      if (iter.completed) {
        len--;

        if (iterIdx !== 0) {
          iterIdx--;
        }

        iters.splice(iterIdx, 1);
        continue;
      }

      if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
        chosenIter = iter;
      }
    }

    return chosenIter;
  }

}

class Event {
  constructor(component, options) {
    this.THISANDFUTURE = 'THISANDFUTURE';
    this.exceptions = [];
    this.strictExceptions = false;

    if (component) {
      this.component = component;
    } else {
      this.component = new Component('vevent');
    }

    this._rangeExceptionCache = Object.create(null);
    this.exceptions = Object.create(null);
    this.rangeExceptions = [];

    if (options && options.strictExceptions) {
      this.strictExceptions = options.strictExceptions;
    }

    if (options && options.exceptions) {
      options.exceptions.forEach(this.relateException, this);
    } else if (this.component.parent && !this.isRecurrenceException()) {
      this.component.parent.getAllSubcomponents('vevent').forEach(function (event) {
        if (event.hasProperty('recurrence-id')) {
          this.relateException(event);
        }
      }, this);
    }
  }

  relateException(obj) {
    if (this.isRecurrenceException()) {
      throw new Error('cannot relate exception to exceptions');
    }

    if (obj instanceof Component) {
      obj = new Event(obj);
    }

    if (this.strictExceptions && obj.uid !== this.uid) {
      throw new Error('attempted to relate unrelated exception');
    }

    const id = obj.recurrenceId.toString();
    this.exceptions[id] = obj;

    if (obj.modifiesFuture()) {
      const item = [obj.recurrenceId.toUnixTime(), id];
      const idx = binsearchInsert(this.rangeExceptions, item, compareRangeException);
      this.rangeExceptions.splice(idx, 0, item);
    }
  }

  modifiesFuture() {
    if (!this.component.hasProperty('recurrence-id')) {
      return false;
    }

    const range = this.component.getFirstProperty('recurrence-id').getParameter('range');
    return range === this.THISANDFUTURE;
  }

  findRangeException(time) {
    if (!this.rangeExceptions.length) {
      return;
    }

    const utc = time.toUnixTime();
    let idx = binsearchInsert(this.rangeExceptions, [utc], compareRangeException);
    idx -= 1;

    if (idx < 0) {
      return;
    }

    const rangeItem = this.rangeExceptions[idx];

    if (utc < rangeItem[0]) {
      return;
    }

    return rangeItem[1];
  }

  getOccurrenceDetails(occurrence) {
    const id = occurrence.toString();
    const utcId = occurrence.convertToZone(Timezone.utcTimezone).toString();
    let item;
    const result = {
      recurrenceId: occurrence
    };

    if (id in this.exceptions) {
      item = result.item = this.exceptions[id];
      result.startDate = item.startDate;
      result.endDate = item.endDate;
      result.item = item;
    } else if (utcId in this.exceptions) {
      item = this.exceptions[utcId];
      result.startDate = item.startDate;
      result.endDate = item.endDate;
      result.item = item;
    } else {
      const rangeExceptionId = this.findRangeException(occurrence);
      let end;

      if (rangeExceptionId) {
        const exception = this.exceptions[rangeExceptionId];
        result.item = exception;
        let startDiff = this._rangeExceptionCache[rangeExceptionId];

        if (!startDiff) {
          const original = exception.recurrenceId.clone();
          const newStart = exception.startDate.clone();
          original.zone = newStart.zone;
          startDiff = newStart.subtractDate(original);
          this._rangeExceptionCache[rangeExceptionId] = startDiff;
        }

        const start = occurrence.clone();
        start.zone = exception.startDate.zone;
        start.addDuration(startDiff);
        end = start.clone();
        end.addDuration(exception.duration);
        result.startDate = start;
        result.endDate = end;
      } else {
        end = occurrence.clone();
        end.addDuration(this.duration);
        result.endDate = end;
        result.startDate = occurrence;
        result.item = this;
      }
    }

    return result;
  }

  iterator(startTime) {
    return new RecurExpansion({
      component: this.component,
      dtstart: startTime || this.startDate
    });
  }

  isRecurring() {
    const comp = this.component;
    return comp.hasProperty('rrule') || comp.hasProperty('rdate');
  }

  isRecurrenceException() {
    return this.component.hasProperty('recurrence-id');
  }

  getRecurrenceTypes() {
    const rules = this.component.getAllProperties('rrule');
    let i = 0;
    const len = rules.length;
    const result = Object.create(null);

    for (; i < len; i++) {
      const value = rules[i].getFirstValue();
      result[value.freq] = true;
    }

    return result;
  }

  get uid() {
    return this._firstProp('uid');
  }

  set uid(value) {
    this._setProp('uid', value);
  }

  get startDate() {
    return this._firstProp('dtstart');
  }

  set startDate(value) {
    this._setTime('dtstart', value);
  }

  get endDate() {
    let endDate = this._firstProp('dtend');

    if (!endDate) {
      const duration = this._firstProp('duration');

      endDate = this.startDate.clone();

      if (duration) {
        endDate.addDuration(duration);
      } else if (endDate.isDate) {
        endDate.day += 1;
      }
    }

    return endDate;
  }

  set endDate(value) {
    if (this.component.hasProperty('duration')) {
      this.component.removeProperty('duration');
    }

    this._setTime('dtend', value);
  }

  get duration() {
    const duration = this._firstProp('duration');

    if (!duration) {
      return this.endDate.subtractDate(this.startDate);
    }

    return duration;
  }

  set duration(value) {
    if (this.component.hasProperty('dtend')) {
      this.component.removeProperty('dtend');
    }

    this._setProp('duration', value);
  }

  get location() {
    return this._firstProp('location');
  }

  set location(value) {
    this._setProp('location', value);
  }

  get attendees() {
    return this.component.getAllProperties('attendee');
  }

  get summary() {
    return this._firstProp('summary');
  }

  set summary(value) {
    this._setProp('summary', value);
  }

  get description() {
    return this._firstProp('description');
  }

  set description(value) {
    this._setProp('description', value);
  }

  get organizer() {
    return this._firstProp('organizer');
  }

  set organizer(value) {
    this._setProp('organizer', value);
  }

  get sequence() {
    return this._firstProp('sequence');
  }

  set sequence(value) {
    this._setProp('sequence', value);
  }

  get recurrenceId() {
    return this._firstProp('recurrence-id');
  }

  set recurrenceId(value) {
    this._setProp('recurrence-id', value);
  }

  _setTime(propName, time) {
    let prop = this.component.getFirstProperty(propName);

    if (!prop) {
      prop = new Property(propName);
      this.component.addProperty(prop);
    }

    if (time.zone === Timezone.localTimezone || time.zone === Timezone.utcTimezone) {
      prop.removeParameter('tzid');
    } else {
      prop.setParameter('tzid', time.zone.tzid);
    }

    prop.setValue(time);
  }

  _setProp(name, value) {
    this.component.updatePropertyWithValue(name, value);
  }

  _firstProp(name) {
    return this.component.getFirstPropertyValue(name);
  }

  toJSON() {
    return {
      component: this.component.toJSON()
    };
  }

  toString() {
    return this.component.toString();
  }

}

function compareRangeException(a, b) {
  if (a[0] > b[0]) return 1;
  if (b[0] > a[0]) return -1;
  return 0;
}

function ComponentParser({
  parseEvent = true,
  parseTimezone = true
} = {}) {
  const ee = new events.EventEmitter();

  ee.process = async function process(ical) {
    if (typeof ical === 'string') {
      ical = parse(ical);
    }

    if (!(ical instanceof Component)) {
      ical = new Component(ical);
    }

    for (const component of ical.getAllSubcomponents()) {
      switch (component.name) {
        case 'vtimezone':
          if (parseTimezone) {
            const tzid = component.getFirstPropertyValue('tzid');

            if (tzid) {
              ee.emit('timezone', new Timezone({
                tzid,
                component
              }));
            }
          }

          break;

        case 'vevent':
          if (parseEvent) {
            ee.emit('event', new Event(component));
          }

          break;

        default:
          continue;
      }
    }

    await 0;
    ee.emit('complete');
  };

  return ee;
}

reset();

exports.helpers = helpers;
exports.TimezoneService = TimezoneService;
exports.Binary = Binary;
exports.Component = Component;
exports.ComponentParser = ComponentParser;
exports.design = design;
exports.Duration = Duration;
exports.Event = Event;
exports.parse = parse;
exports.Period = Period;
exports.Property = Property;
exports.Recur = Recur;
exports.RecurExpansion = RecurExpansion;
exports.RecurIterator = RecurIterator;
exports.stringify = stringify;
exports.Time = Time;
exports.Timezone = Timezone;
exports.UtcOffset = UtcOffset;
exports.VCardTime = VCardTime;
exports.newLineChar = newLineChar;
exports.setFoldLength = setFoldLength;
