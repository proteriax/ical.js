import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample, useTimezones } from './helper'
import { describe, it } from 'mocha'
import { WeekDay } from '../lib/ical';

describe('icaltime', () => {
  const Time = ICAL.Time
  const Timezone = ICAL.Timezone

  it('round trip', () => {
    const f = new Time({
      second: 1,
      minute: 2,
      hour: 3,
      day: 4,
      month: 5,
      year: 6007
    })

    const g = f.clone()
    g.fromJSDate(f.toJSDate())
    expect(f.toString()).to.equal(g.toString())
    // TODO also check UTC dates

    g.reset()
    expect(g).to.equal(Time.epochTime.toString())
  })

  describe('initialize', async () => {
    const icsData = await defineSample('timezones/America/New_York.ics')

    it('with timezone', () => {
      const parsed = ICAL.parse(icsData)
      const vcalendar = new ICAL.Component(parsed)
      const vtimezone = vcalendar.getFirstSubcomponent('vtimezone')!
      const tzid = vtimezone.getFirstPropertyValue('tzid')

      ICAL.TimezoneService.register(vtimezone)

      // utc -5
      const time = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 10,
        timezone: tzid
      })

      // -5
      expect(time.utcOffset() / 3600).to.equal(-5)

      expect(
        time.toUnixTime()).to.equal(
        Date.UTC(2012, 0, 1, 15) / 1000
      )
    })
  })

  describe('.icaltime', () => {
    function verify(time, type: string) {
      it('convert time ' + JSON.stringify(time), () => {
        expect(new ICAL.Time(time).icaltype).to.equal(type)
      })
    }

    verify({ year: 2013, month: 1, day: 1 }, 'date')
    verify({ year: 2013, month: 1, day: 1, hour: 3, isDate: true }, 'date')
    verify({ year: 2013, month: 1, day: 1, hour: 22 }, 'date-time')

    verify({ year: 2013, isDate: false }, 'date-time')

    it('converting types during runtime', () => {
      const time = new ICAL.Time({ year: 2013, isDate: false })
      time.isDate = true
      expect(time.icaltype).to.equal('date')
    })
  })

  describe('setters', () => {
    const subject = new ICAL.Time({
      year: 2012,
      month: 12,
      day: 31,
      // needed otherwise this object
      // is treated as a date rather then
      // date-time and hour/minute/second will
      // not be normalized/adjusted.
      hour: 0
    })

    function movedToNextYear() {
      expect(subject.day).to.equal(1)
      expect(subject.month).to.equal(1)
      expect(subject.year).to.equal(2013)
    }

    it('.month / .day beyond the year', () => {
      subject.day++
      subject.month++

      expect(subject.day).to.equal(1)
      expect(subject.month).to.equal(2)
      expect(subject.year).to.equal(2013)
    })

    it('.hour', () => {
      subject.hour = 23
      subject.hour++

      movedToNextYear()
      expect(subject.hour).to.equal(0)
    })

    it('.minute', () => {
      subject.minute = 59
      subject.hour = 23
      subject.minute++

      movedToNextYear()
      expect(subject.hour).to.equal(0)
      expect(subject.minute).to.equal(0)
    })

    it('.second', () => {
      subject.hour = 23
      subject.minute = 59
      subject.second = 59

      subject.second++

      movedToNextYear()
      expect(subject.minute).to.equal(0)
      expect(subject.second).to.equal(0)
    })
  })

  describe('#subtractDate and #subtractDateTz', () => {
    useTimezones(ICAL, 'America/Los_Angeles', 'America/New_York')

    it('diff between two times in different timezones', () => {
      // 3 hours ahead of west
      const east = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 10,
        minute: 20,
        timezone: 'America/New_York'
      })


      const west = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 12,
        minute: 50,
        timezone: 'America/Los_Angeles'
      })

      const diff1 = west.subtractDate(east)
      expect(diff1).to.include({
        hours: 2,
        minutes: 30,
        isNegative: false
      })
      const diff2 = west.subtractDateTz(east)
      expect(diff2).to.include({
        hours: 5,
        minutes: 30,
        isNegative: false
      })
    })

    it('diff between two times in same timezone', () => {
      const t1 = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 21,
        minute: 50,
        timezone: 'America/Los_Angeles'
      })
      const t2 = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 8,
        minute: 30,
        timezone: 'America/Los_Angeles'
      })

      const diff1 = t1.subtractDate(t2)
      expect(diff1).to.include({
        hours: 13,
        minutes: 20,
        isNegative: false
      })

      const diff2 = t1.subtractDateTz(t2)
      expect(diff2).to.include({
        hours: 13,
        minutes: 20,
        isNegative: false
      })
    })
    it('negative absolute difference', () => {
      const t1 = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 8,
        minute: 30,
        timezone: 'America/Los_Angeles'
      })
      const t2 = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 21,
        minute: 50,
        timezone: 'America/Los_Angeles'
      })

      const diff = t1.subtractDate(t2)

      expect(diff).to.include({
        hours: 13,
        minutes: 20,
        isNegative: true
      })
    })
  })

  describe('#fromJSDate', () => {

    it('utc', () => {
      const date = new Date(2012, 0, 1)
      const expected = {
        year: date.getUTCFullYear(),
        // + 1 ICAL.js is not zero based...
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds()
      }

      const subject = Time.fromJSDate(date, true)

      expect(subject).to.include(expected)
    })

    it('floating', () => {
      const date = new Date(2012, 0, 1)
      const subject = Time.fromJSDate(date)

      expect(subject.toJSDate()).to.deep.equal(date)
    })

    it('reset', () => {
      const subject = Time.fromJSDate(null)
      const expected = {
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        isDate: false,
        timezone: 'Z'
      }

      expect(
        subject).to.include(expected
      )
    })
  })

  describe('#fromData', () => {
    it('empty object', () => {
      const subject = Time.fromData()
      const expected = {
        year: 0,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0
      }

      expect(subject).to.include(expected, 'starts at begining of time')
    })

    it('with year, month', () => {
      const subject = Time.fromData({
        year: 2012,
        month: 1
      })

      expect(subject).to.include({
        year: 2012,
        month: 1
      })
    })

    it('utc timezone', () => {
      const subject = Time.fromData({
        year: 2012,
        timezone: 'Z'
      })

      expect(subject).to.include({
        year: 2012,
        zone: Timezone.utcTimezone
      })
    })

    it('floating timezone', () => {
      const subject = Time.fromData({
        year: 2012,
        timezone: 'floating'
      })

      expect(subject).to.include({
        year: 2012,
        zone: Timezone.localTimezone
      })
    })

    it('setting icaltype', () => {
      const subject = Time.fromData({
        ['icaltype' as any]: 'date-time',
        year: 2012,
        month: 1
      })

      expect(subject).to.include({
        icaltype: 'date',
        year: 2012,
        month: 1
      })
    })
  })

  describe('#dayOfWeek', () => {

    // format for dayOfWeek assertion
    // is [dayNumber, dateObject]
    const assertions: [WeekDay, Date][] = [
      [Time.SUNDAY, new Date(2012, 0, 1)],
      [Time.MONDAY, new Date(2012, 0, 2)],
      [Time.TUESDAY, new Date(2012, 0, 3)],
      [Time.WEDNESDAY, new Date(2012, 0, 4)],
      [Time.THURSDAY, new Date(2012, 0, 5)],
      [Time.FRIDAY, new Date(2012, 0, 6)],
      [Time.SATURDAY, new Date(2012, 0, 7)]
      // TODO: Add more I was lazy here this is
      //      mostly to check that the function is
      //      sane but if there is a bug somewhere
      //      we can add tests above...
    ]

    assertions.forEach(([dayOfWeek, date]) => {
      const human = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()
      const msg = human + ' should be #' + dayOfWeek + ' day'

      it(msg, () => {
        const subject = ICAL.Time.fromJSDate(date)
        expect(subject.dayOfWeek()).to.equal(dayOfWeek)
      })
    })

  })

  describe('#dayOfYear', () => {
    let inc

    function testYear(start) {
      let end = new Date(
        start.getFullYear() + 1,
        start.getMonth(),
        start.getDate()
      )

      const max = 400
      let cur = start
      const date = new Date()
      inc = 1
      let time = Time.fromJSDate(cur)

      end = new Date(
        end.getFullYear(),
        end.getMonth(),
        0
      )

      while (end.valueOf() >= cur.valueOf()) {
        if (inc > max) {
          throw new Error('test error inf loop')
          break
        }

        expect(time.dayOfYear()).to.equal(inc, cur.toString())

        cur = new Date(start.getFullYear(), 0, start.getDate() + inc)
        time = Time.fromJSDate(cur)
        inc++
      }
    }

    it('full year (2011/no leap)', () => {
      testYear(new Date(2011, 0, 1))
      expect(inc - 1).to.equal(365, 'is not leap')
    })

    it('full year (2012 + leap)', () => {
      testYear(new Date(2012, 0, 1))
      expect(inc - 1).to.equal(366, 'is leap')
    })
  })

  describe('#startOfWeek', () => {
    const start = new Date(2012, 1, 1)
    const time = Time.fromJSDate(new Date(2012, 0, 29))

    const expected = {
      year: time.year,
      month: time.month,
      day: time.day,
      minute: time.minute,
      second: time.second
    }

    const max = 4
    for (let day = 0; day < max; day++) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + day
      )

      it(`converts "${date.toString()}" to first day of week`, () => {
        const subject = Time.fromJSDate(date)
        expect(subject.startOfWeek()).to.include(expected)
      })
    }

  })

  describe('#getDominicalLetter', () => {
    it('instance', () => {
      const subject = (year: number) =>
        new ICAL.Time({ year }).getDominicalLetter()

      expect(subject(1989)).to.equal('A')
      expect(subject(1990)).to.equal('G')
      expect(subject(1991)).to.equal('F')
      expect(subject(1993)).to.equal('C')
      expect(subject(1994)).to.equal('B')
      expect(subject(1997)).to.equal('E')
      expect(subject(1998)).to.equal('D')

      expect(subject(2000)).to.equal('BA')
      expect(subject(2004)).to.equal('DC')
      expect(subject(2008)).to.equal('FE')
      expect(subject(2012)).to.equal('AG')
      expect(subject(2016)).to.equal('CB')
      expect(subject(2020)).to.equal('ED')
      expect(subject(2024)).to.equal('GF')

    })
    it('static', () => {
      const subject = ICAL.Time.getDominicalLetter
      expect(subject(1989)).to.equal('A')
      expect(subject(1990)).to.equal('G')
      expect(subject(1991)).to.equal('F')
      expect(subject(1993)).to.equal('C')
      expect(subject(1994)).to.equal('B')
      expect(subject(1997)).to.equal('E')
      expect(subject(1998)).to.equal('D')

      expect(subject(2000)).to.equal('BA')
      expect(subject(2004)).to.equal('DC')
      expect(subject(2008)).to.equal('FE')
      expect(subject(2012)).to.equal('AG')
      expect(subject(2016)).to.equal('CB')
      expect(subject(2020)).to.equal('ED')
      expect(subject(2024)).to.equal('GF')
    })
  })

  describe('#nthWeekDay', () => {
    describe('negative', () => {
      it('last saturday in Sept 2012 (before current day)', () => {
        const time = Time.fromData({ year: 2012, month: 9, day: 1 })

        const day = time.nthWeekDay(Time.SATURDAY, -1)
        const date = new Date(2012, 8, day)

        expect(
          date).to.deep.equal(
          new Date(2012, 8, 29)
        )
      })

      it('last Monday in Jan 2012 (target after current day)', () => {
        const time = Time.fromData({ year: 2012, month: 1, day: 1 })

        const day = time.nthWeekDay(Time.MONDAY, -1)
        const date = new Date(2012, 0, day)

        expect(
          new Date(2012, 0, 30)).to.deep.equal(
          date
        )
      })

      it('2nd to last friday after May 15th 2012 (multiple weeks)', () => {
        const time = Time.fromData({ year: 2012, month: 5, day: 15 })

        const day = time.nthWeekDay(Time.FRIDAY, -2)
        const date = new Date(2012, 4, day)

        expect(
          date).to.deep.equal(
          new Date(2012, 4, 18)
        )
      })

      it('third to last Tuesday in April 2012 (tuesday)', () => {
        const time = Time.fromData({ year: 2012, month: 4, day: 5 })

        const day = time.nthWeekDay(Time.TUESDAY, -3)
        const date = new Date(2012, 3, day)

        expect(
          date).to.deep.equal(
          new Date(2012, 3, 10)
        )
      })

    })

    describe('positive', () => {

      it('1st wed in Feb 2012 (start is day)', () => {
        const time = Time.fromData({ year: 2012, month: 2, day: 1 })
        const day = time.nthWeekDay(Time.WEDNESDAY, 0)
        const date = new Date(2012, 1, day)
        expect(date).to.deep.equal(new Date(2012, 1, 1))
      })

      it('1st monday in Feb 2012 (start is after day)', () => {
        const time = Time.fromData({ year: 2012, month: 2, day: 1 })
        const day = time.nthWeekDay(Time.MONDAY, 0)

        const date = new Date(2012, 1, day)

        expect(date).to.deep.equal(new Date(2012, 1, 6))
      })

      it('20th monday of year (multiple months)', () => {
        const time = Time.fromData({ year: 2012, month: 1, day: 1 })

        const day = time.nthWeekDay(Time.MONDAY, 20)
        const date = new Date(2012, 0, day)

        expect(date).to.deep.equal(new Date(2012, 4, 14))
      })

      it('3rd monday (multiple)', () => {
        const time = Time.fromData({ year: 2012, month: 1, day: 1 })
        const day = time.nthWeekDay(Time.MONDAY, 3)
        const date = new Date(2012, 0, day)
        expect(date).to.deep.equal(new Date(2012, 0, 16))
      })
    })
  })

  describe('#isNthWeekDay', () => {

    it('each day of the week', () => {
      // Remember 1 === SUNDAY not MONDAY
      const start = new Date(2012, 3, 8)
      let time

      for (let dow = 1; dow <= 7; dow++) {
        time = Time.fromJSDate(new Date(
          start.getFullYear(),
          start.getMonth(),
          7 + dow // 8, 9, etc..
        ))

        expect(time.isNthWeekDay(dow, 2, 31),
          time.toJSDate().toString() +
          ` should be 2nd occurrence of ${dow} weekday`
        ).to.be.true
      }
    })

    it('on any weekday', () => {
      const dt = Time.fromString('2013-01-08')
      expect(dt.isNthWeekDay(Time.TUESDAY, 0)).to.be.true
    })
    it('not weekday at all', () => {
      const dt = Time.fromString('2013-01-08')
      expect(dt.isNthWeekDay(Time.WEDNESDAY, 0)).to.be.false
    })
    it('not nth weekday', () => {
      const dt = Time.fromString('2013-01-08')
      expect(dt.isNthWeekDay(Time.TUESDAY, 3)).to.be.false
    })

  })

  describe('#toUnixTime', () => {
    it('without timezone', () => {
      const date = new Date(2012, 0, 22, 1, 7, 39)
      const time = new ICAL.Time({
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds()
      })

      expect(time.toUnixTime()).to.equal(date.valueOf() / 1000)
    })

    describe('with timezone', async () => {
      const icsData = await defineSample('timezones/America/Los_Angeles.ics')

      const parsed = ICAL.parse(icsData)
      const vcalendar = new ICAL.Component(parsed)
      const comp = vcalendar.getFirstSubcomponent('vtimezone')!

      const zone = new ICAL.Timezone({
        tzid: comp.getFirstPropertyValue('tzid'),
        component: comp,
      })

      const subject = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 10
      }, zone)

      it('result', () => {
        // we know that subject is -8
        const expectedTime = Date.UTC(
          2012,
          0,
          1,
          18
        ) / 1000

        expect(subject.toUnixTime()).to.equal(expectedTime)
      })
    })
  })

  it('#fromUnixTime', () => {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 5,
      hour: 8,
      minute: 4,
      second: 13,
      timezone: 'Z'
    })

    const otherTime = new ICAL.Time()
    otherTime.fromUnixTime(time.toUnixTime())

    expect(
      time.toJSDate()).to.deep.equal(
      otherTime.toJSDate()
    )

    otherTime.fromUnixTime(time.toUnixTime() + 0.123)

    expect(time.toUnixTime()).to.equal(otherTime.toUnixTime())
    expect(
      time.toJSDate()).to.deep.equal(
      otherTime.toJSDate()
    )
    expect(time.second).to.deep.equal(
      otherTime.second
    )
  })

  describe('#adjust', () => {
    const date = new Date(2012, 0, 25)

    it('overflow days - negative', () => {
      const time = Time.fromJSDate(date)
      time.adjust(-35, 0, 0, 0)

      expect(
        time.toJSDate()).to.deep.equal(
        new Date(2011, 11, 21)
      )
    })

    it('overflow days - positive', () => {
      const time = Time.fromJSDate(date)

      time.adjust(20, 0, 0, 0)

      expect(
        time.toJSDate()).to.deep.equal(
        new Date(2012, 1, 14)
      )
    })

    it('overflow years normalization  - negative', () => {
      const time = Time.fromJSDate(date)

      time.month = 0
      time.adjust(0, 0, 0, 0)

      expect(
        time.toJSDate()).to.deep.equal(
        new Date(2011, 11, 25)
      )
    })

    it('overflow years normalization  - positive', () => {
      const time = Time.fromJSDate(date)

      time.month = 13
      time.adjust(0, 0, 0, 0)

      expect(
        time.toJSDate()).to.deep.equal(
        new Date(2013, 0, 25)
      )
    })

  })

  describe('#startDoyWeek', () => {

    it('forward (using defaults)', () => {
      const subject = Time.fromData({ year: 2012, month: 1, day: 20 })
      const result = subject.startDoyWeek()
      expect(result).to.equal(15, 'should start on sunday of that week')
    })
    it('with different wkst', () => {
      const subject = Time.fromData({ year: 2012, month: 1, day: 1 })
      const result = subject.startDoyWeek(ICAL.Time.MONDAY)
      expect(result).to.equal(-5)
    })
    it('falls on zero', () => {
      const subject = Time.fromData({ year: 2013, month: 1, day: 1 })
      const result = subject.startDoyWeek(ICAL.Time.MONDAY)
      expect(result).to.equal(0)
    })
  })

  describe('#toString', () => {
    it('from fractional seconds', () => {
      const subject = new ICAL.Time({
        year: 2012,
        month: 10,
        day: 10,
        minute: 50,
        // I found this while testing in gaia
        second: 8.3,
        isDate: false
      })

      expect(
        subject.toString()).to.equal(
        '2012-10-10T00:50:08'
      )
    })
  })

  describe('#toICALString', () => {
    it('date', () => {
      const subject = ICAL.Time.fromString('2012-10-12')
      expect(subject.toICALString()).to.equal('20121012')
    })

    it('date-time', () => {
      const subject = ICAL.Time.fromString('2012-10-12T07:08:09')
      expect(subject.toICALString()).to.equal('20121012T070809')
    })
  })

  describe('#toJSON', () => {
    it('with utc time', () => {
      const time = new Time({
        year: 2012,
        day: 1,
        month: 1,
        hour: 3,
        timezone: Timezone.utcTimezone,
      })

      const after = new Time(time.toJSON())
      expect(after.zone).to.equal(Timezone.utcTimezone)

      expect(
        after.toJSDate()).to.deep.equal(
        time.toJSDate()
      )
    })

    it('with floating time', () => {
      const time = new Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 2,
        minute: 15,
        second: 1,
        isDate: false,
        timezone: Timezone.localTimezone,
      })

      const expected = {
        year: 2012,
        month: 1,
        day: 1,
        hour: 2,
        minute: 15,
        second: 1,
        isDate: false,
        timezone: 'floating'
      }

      expect(time.toJSON()).to.deep.equal(expected)

      const after = new Time(time.toJSON())
      expect(after.zone).to.equal(Timezone.localTimezone)

      expect(time.toJSDate()).to.deep.equal(after.toJSDate())
    })

    it('with null timezone', () => {
      const time = new Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 2,
        minute: 15,
        second: 1,
        isDate: false,
      })
      time.zone = undefined as any

      const expected = {
        year: 2012,
        month: 1,
        day: 1,
        hour: 2,
        minute: 15,
        second: 1,
        isDate: false,
      }

      expect(time.toJSON()).to.deep.equal(expected)
    })
  })

  it('calculations', () => {

    const test_data = [{
      str: '2012-01-01T00:00:00',
      expect_unixtime: 1325376000,
      expect_1s: '2012-01-01T00:00:01',
      expect_1m: '2012-01-01T00:01:00',
      expect_1h: '2012-01-01T01:00:00',
      expect_1d: '2012-01-02T00:00:00',
      expect_1w: '2012-01-08T00:00:00'
    }]

    for (const datakey in test_data) {
      const data = test_data[datakey]
      const dt = Time.fromString(data.str)
      let cp = dt.clone()

      expect(dt.toUnixTime()).to.equal(data.expect_unixtime)
      const dur = dt.subtractDate(Time.epochTime)
      expect(dur.toSeconds()).to.equal(data.expect_unixtime)

      cp = dt.clone()
      cp.year += 1

      let diff = cp.subtractDate(dt)
      let yearseconds = (365 + +Time.isLeapYear(dt.year)) * 86400
      expect(diff.toSeconds()).to.equal(yearseconds)

      cp = dt.clone()
      cp.year += 2
      diff = cp.subtractDate(dt)
      yearseconds = (365 + +Time.isLeapYear(dt.year) + 365 + +Time.isLeapYear(dt.year + 1)) * 86400
      expect(diff.toSeconds()).to.equal(yearseconds)

      cp = dt.clone()
      cp.year -= 1
      diff = cp.subtractDate(dt)
      yearseconds = (365 + +Time.isLeapYear(cp.year)) * 86400
      expect(diff.toSeconds()).to.equal(-yearseconds)

      cp = dt.clone()
      cp.second += 3
      diff = cp.subtractDate(dt)
      expect(diff.toSeconds()).to.equal(3)

      cp = dt.clone()
      cp.addDuration(ICAL.Duration.fromString('PT1S'))
      expect(cp).to.equal(data.expect_1s)
      cp.addDuration(ICAL.Duration.fromString('-PT1S'))
      expect(cp.toString()).to.equal(dt.toString())

      cp.addDuration(ICAL.Duration.fromString('PT1M'))
      expect(cp).to.equal(data.expect_1m)
      cp.addDuration(ICAL.Duration.fromString('-PT1M'))
      expect(cp.toString()).to.equal(dt.toString())

      cp.addDuration(ICAL.Duration.fromString('PT1H'))
      expect(cp).to.equal(data.expect_1h)
      cp.addDuration(ICAL.Duration.fromString('-PT1H'))
      expect(cp.toString()).to.equal(dt.toString())

      cp.addDuration(ICAL.Duration.fromString('P1D'))
      expect(cp).to.equal(data.expect_1d)
      cp.addDuration(ICAL.Duration.fromString('-P1D'))
      expect(cp.toString()).to.equal(dt.toString())

      cp.addDuration(ICAL.Duration.fromString('P1W'))
      expect(cp).to.equal(data.expect_1w)
      cp.addDuration(ICAL.Duration.fromString('-P1W'))
      expect(cp.toString()).to.equal(dt.toString())

      cp = dt.clone()
      cp.addDuration(ICAL.Duration.fromString('PT24H'))
      cp.isDate = true
      cp.isDate// force normalize
      cp.isDate = false
      expect(cp).to.equal(data.expect_1d)
    }
  })

  it('#normalize', () => {
    const f = new Time({
      second: 59,
      minute: 59,
      hour: 23,
      day: 31,
      month: 12,
      year: 2012
    })

    const test_data = [{
      str: '2012-12-31T23:59:59',
      add_seconds: 1,
      expect: '2013-01-01T00:00:00'
    }, {
      str: '2011-01-01T00:00:00',
      add_seconds: -1,
      expect: '2010-12-31T23:59:59'
    }]

    for (const datakey in test_data) {
      const data = test_data[datakey]
      const dt = Time.fromString(data.str)
      const cur_seconds = dt.second
      const add_seconds = data.add_seconds || 0

      dt.second += add_seconds
      expect(dt).to.equal(data.expect)
    }
  })

  describe('date properites', () => {
    function testDateProperties(str, data, only?: boolean) {
      (only ? it.only : it)(str, () => {
        let dt = Time.fromString(str)
        expect(data.isDate).to.equal(dt.isDate)
        expect(data.year).to.equal(dt.year)
        expect(data.month).to.equal(dt.month)
        expect(data.day).to.equal(dt.day)
        expect(data.hour).to.equal(dt.hour)
        expect(data.minute).to.equal(dt.minute)
        expect(data.second).to.equal(dt.second)
        expect(data.leap_year).to.equal(Time.isLeapYear(dt.year))
        expect(data.dayOfWeek).to.equal(dt.dayOfWeek().toString())
        expect(data.dayOfYear).to.equal(dt.dayOfYear().toString())
        expect(data.startOfWeek).to.equal(dt.startOfWeek().toString())
        expect(data.endOfWeek).to.equal(dt.endOfWeek().toString())
        expect(data.startOfMonth).to.equal(dt.startOfMonth().toString())
        expect(data.endOfMonth).to.equal(dt.endOfMonth().toString())
        expect(data.startOfYear).to.equal(dt.startOfYear().toString())
        expect(data.endOfYear).to.equal(dt.endOfYear().toString())
        expect(data.startDoyWeek).to.equal(dt.startDoyWeek(Time.SUNDAY))
        expect(data.weekNumber).to.equal(dt.weekNumber(Time.SUNDAY))
        expect(data.getDominicalLetter).to.equal(dt.getDominicalLetter())
        // TODO nthWeekDay

        dt = new Time()
        dt.resetTo(data.year, data.month, data.day, data.hour, data.minute,
                   data.second, Timezone.utcTimezone)
        expect(data.year).to.equal(dt.year)
        expect(data.month).to.equal(dt.month)
        expect(data.day).to.equal(dt.day)
        expect(data.hour).to.equal(dt.hour)
        expect(data.minute).to.equal(dt.minute)
        expect(data.second).to.equal(dt.second)
      })
    }
    testDateProperties.only = function (str, data) {
      testDateProperties(str, data, true)
    }

    // A date where the year starts on sunday
    testDateProperties('2012-01-01T00:00:00', {
      isDate: false,
      year: 2012,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      leap_year: true,
      dayOfWeek: Time.SUNDAY,
      dayOfYear: 1,
      startOfWeek: '2012-01-01',
      endOfWeek: '2012-01-07',
      startOfMonth: '2012-01-01',
      endOfMonth: '2012-01-31',
      startOfYear: '2012-01-01',
      endOfYear: '2012-12-31',
      startDoyWeek: 1,
      weekNumber: 1,
      getDominicalLetter: 'AG'
    })
    // A date in week number 53
    testDateProperties('2005-01-01T00:00:00', {
      isDate: false,
      year: 2005,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      leap_year: false,
      dayOfWeek: Time.SATURDAY,
      dayOfYear: 1,
      startOfWeek: '2004-12-26',
      endOfWeek: '2005-01-01',
      startOfMonth: '2005-01-01',
      endOfMonth: '2005-01-31',
      startOfYear: '2005-01-01',
      endOfYear: '2005-12-31',
      getDominicalLetter: 'B',
      startDoyWeek: -5,
      weekNumber: 53
    })
    // A time in week number 28
    testDateProperties('2015-07-08T01:02:03', {
      isDate: false,
      year: 2015,
      month: 7,
      day: 8,
      hour: 1,
      minute: 2,
      second: 3,
      leap_year: false,
      dayOfWeek: Time.WEDNESDAY,
      dayOfYear: 189,
      startOfWeek: '2015-07-05',
      endOfWeek: '2015-07-11',
      startOfMonth: '2015-07-01',
      endOfMonth: '2015-07-31',
      startOfYear: '2015-01-01',
      endOfYear: '2015-12-31',
      startDoyWeek: 186,
      getDominicalLetter: 'D',
      weekNumber: 28
    })
  })

  it('startOfWeek with different first day of week', () => {
    const test_data = [{ /* A Sunday */
      str: '2012-01-01T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-01',
          MONDAY: '2011-12-26',
          TUESDAY: '2011-12-27',
          WEDNESDAY: '2011-12-28',
          THURSDAY: '2011-12-29',
          FRIDAY: '2011-12-30',
          SATURDAY: '2011-12-31'
      }
    }, { /* A Monday */
      str: '2012-01-02T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-01',
          MONDAY: '2012-01-02',
          TUESDAY: '2011-12-27',
          WEDNESDAY: '2011-12-28',
          THURSDAY: '2011-12-29',
          FRIDAY: '2011-12-30',
          SATURDAY: '2011-12-31'
      }
    }, { /* A Tuesday */
      str: '2012-01-03T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-01',
          MONDAY: '2012-01-02',
          TUESDAY: '2012-01-03',
          WEDNESDAY: '2011-12-28',
          THURSDAY: '2011-12-29',
          FRIDAY: '2011-12-30',
          SATURDAY: '2011-12-31'
      }
    }, { /* A Wednesday */
      str: '2012-01-04T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-01',
          MONDAY: '2012-01-02',
          TUESDAY: '2012-01-03',
          WEDNESDAY: '2012-01-04',
          THURSDAY: '2011-12-29',
          FRIDAY: '2011-12-30',
          SATURDAY: '2011-12-31'
      }
    }, { /* A Thursday */
      str: '2012-01-05T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-01',
          MONDAY: '2012-01-02',
          TUESDAY: '2012-01-03',
          WEDNESDAY: '2012-01-04',
          THURSDAY: '2012-01-05',
          FRIDAY: '2011-12-30',
          SATURDAY: '2011-12-31'
      }
    }, { /* A Friday */
      str: '2012-01-06T12:01:00',
      firstDayOfWeek: {
        SUNDAY: '2012-01-01',
        MONDAY: '2012-01-02',
        TUESDAY: '2012-01-03',
        WEDNESDAY: '2012-01-04',
        THURSDAY: '2012-01-05',
        FRIDAY: '2012-01-06',
        SATURDAY: '2011-12-31'
      }
    }, { /* A Saturday */
      str: '2012-01-07T12:01:00',
      firstDayOfWeek: {
        SUNDAY: '2012-01-01',
        MONDAY: '2012-01-02',
        TUESDAY: '2012-01-03',
        WEDNESDAY: '2012-01-04',
        THURSDAY: '2012-01-05',
        FRIDAY: '2012-01-06',
        SATURDAY: '2012-01-07'
      }
    }]

    for (const datakey in test_data) {
      const data = test_data[datakey]
      const dt = Time.fromString(data.str)
      for (const day in data.firstDayOfWeek) {
        expect(data.firstDayOfWeek[day])
          .to.equal(dt.startOfWeek(ICAL.Time[day]).toString())
      }
    }
  })

  it('endOfWeek with different first day of week', () => {
    const test_data = [{ /* A Sunday */
      str: '2012-01-01T12:01:00',
      firstDayOfWeek: {
        SUNDAY: '2012-01-07',
        MONDAY: '2012-01-01',
        TUESDAY: '2012-01-02',
        WEDNESDAY: '2012-01-03',
        THURSDAY: '2012-01-04',
        FRIDAY: '2012-01-05',
        SATURDAY: '2012-01-06'
      }
    }, { /* A Monday */
      str: '2012-01-02T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-07',
          MONDAY: '2012-01-08',
          TUESDAY: '2012-01-02',
          WEDNESDAY: '2012-01-03',
          THURSDAY: '2012-01-04',
          FRIDAY: '2012-01-05',
          SATURDAY: '2012-01-06'
      }
    }, { /* A Tuesday */
      str: '2012-01-03T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-07',
          MONDAY: '2012-01-08',
          TUESDAY: '2012-01-09',
          WEDNESDAY: '2012-01-03',
          THURSDAY: '2012-01-04',
          FRIDAY: '2012-01-05',
          SATURDAY: '2012-01-06'
      }
    }, { /* A Wednesday */
      str: '2012-01-04T12:01:00',
      firstDayOfWeek: {
          SUNDAY: '2012-01-07',
          MONDAY: '2012-01-08',
          TUESDAY: '2012-01-09',
          WEDNESDAY: '2012-01-10',
          THURSDAY: '2012-01-04',
          FRIDAY: '2012-01-05',
          SATURDAY: '2012-01-06'
      }
    }, { /* A Thursday */
      str: '2012-01-05T12:01:00',
      firstDayOfWeek: {
        SUNDAY: '2012-01-07',
        MONDAY: '2012-01-08',
        TUESDAY: '2012-01-09',
        WEDNESDAY: '2012-01-10',
        THURSDAY: '2012-01-11',
        FRIDAY: '2012-01-05',
        SATURDAY: '2012-01-06'
      }
    }, { /* A Friday */
      str: '2012-01-06T12:01:00',
      firstDayOfWeek: {
        SUNDAY: '2012-01-07',
        MONDAY: '2012-01-08',
        TUESDAY: '2012-01-09',
        WEDNESDAY: '2012-01-10',
        THURSDAY: '2012-01-11',
        FRIDAY: '2012-01-12',
        SATURDAY: '2012-01-06'
      }
    }, { /* A Saturday */
      str: '2012-01-07T12:01:00',
      firstDayOfWeek: {
        SUNDAY: '2012-01-07',
        MONDAY: '2012-01-08',
        TUESDAY: '2012-01-09',
        WEDNESDAY: '2012-01-10',
        THURSDAY: '2012-01-11',
        FRIDAY: '2012-01-12',
        SATURDAY: '2012-01-13'
      }
    }]

    for (const datakey in test_data) {
      const data = test_data[datakey]
      const dt = Time.fromString(data.str)
      for (const day in data.firstDayOfWeek) {
        expect(data.firstDayOfWeek[day]).to.equal(dt.endOfWeek(ICAL.Time[day]).toString())
      }
    }
  })

  describe('#compare', () => {
    useTimezones(ICAL, 'America/New_York', 'America/Los_Angeles')

    it('simple comparison', () => {
      const a = Time.fromString('2001-01-01T00:00:00')
      let b = Time.fromString('2001-01-01T00:00:00')
      expect(a.compare(b)).to.equal(0)

      b = Time.fromString('2002-01-01T00:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-02-01T00:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-02T00:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-01T01:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-01T00:01:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-01T00:00:01')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)
    })

    it('simple comparison one with a timezone, one without', () => {
      // Floating timezone is effectively UTC. New York is 5 hours behind.
      const a = Time.fromString('2001-01-01T00:00:00')
      a.zone = ICAL.TimezoneService.get('America/New_York')!
      let b = Time.fromString('2001-01-01T05:00:00')
      b.zone = Timezone.localTimezone
      expect(a.compare(b)).to.equal(0)

      b = Time.fromString('2002-01-01T05:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-02-01T05:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-02T05:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-01T06:00:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-01T05:01:00')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)

      b = Time.fromString('2001-01-01T05:00:01')
      expect(a.compare(b)).to.equal(-1)
      expect(b.compare(a)).to.equal(1)
    })

    it('date-only comparison', () => {
      const a = Time.fromString('2001-01-01')
      let b = Time.fromString('2001-01-01')
      expect(a.compareDateOnlyTz(b, Timezone.localTimezone)).to.equal(0)

      b = Time.fromString('2002-01-01')
      expect(a.compareDateOnlyTz(b, Timezone.localTimezone)).to.equal(-1)
      expect(b.compareDateOnlyTz(a, Timezone.localTimezone)).to.equal(1)

      b = Time.fromString('2001-02-01')
      expect(a.compareDateOnlyTz(b, Timezone.localTimezone)).to.equal(-1)
      expect(b.compareDateOnlyTz(a, Timezone.localTimezone)).to.equal(1)

      b = Time.fromString('2001-01-02')
      expect(a.compareDateOnlyTz(b, Timezone.localTimezone)).to.equal(-1)
      expect(b.compareDateOnlyTz(a, Timezone.localTimezone)).to.equal(1)
    })

    it('both are dates', () => {
      const a = Time.fromString('2014-07-20')
      a.zone = ICAL.TimezoneService.get('America/New_York')!
      const b = Time.fromString('2014-07-20')
      b.zone = Timezone.localTimezone

      expect(a.isDate)
      expect(b.isDate)

      expect(a.compareDateOnlyTz(b, a.zone)).to.equal(0)
      expect(a.compareDateOnlyTz(b, b.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, a.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, b.zone)).to.equal(0)

      // Midnight in New York is after midnight UTC.
      expect(a.compare(b)).to.equal(1)
      expect(b.compare(a)).to.equal(-1)
    })

    it('one is date, one isnt', () => {
      const a = Time.fromString('2014-07-20T12:00:00.000')
      a.zone = ICAL.TimezoneService.get('America/New_York')!
      const b = Time.fromString('2014-07-20')
      b.zone = Timezone.localTimezone

      expect(!a.isDate)
      expect(b.isDate)

      expect(a.compareDateOnlyTz(b, a.zone)).to.equal(0)
      expect(a.compareDateOnlyTz(b, b.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, a.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, b.zone)).to.equal(0)

      // Midday in New York is after midnight UTC.
      expect(a.compare(b)).to.equal(1)
      expect(b.compare(a)).to.equal(-1)
    })

    it('one is date, one isnt', () => {
      const a = Time.fromString('2014-07-20T12:00:00.000')
      a.zone = Timezone.localTimezone
      const b = Time.fromString('2014-07-20')
      b.zone = ICAL.TimezoneService.get('America/New_York')!

      expect(!a.isDate)
      expect(b.isDate)

      expect(a.compareDateOnlyTz(b, a.zone)).to.equal(0)
      expect(a.compareDateOnlyTz(b, b.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, a.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, b.zone)).to.equal(0)

      // Midday UTC is after midnight in New York.
      expect(a.compare(b)).to.equal(1)
      expect(b.compare(a)).to.equal(-1)
    })

    it('both are not dates', () => {
      const a = Time.fromString('2014-07-20T12:00:00.000')
      a.zone = ICAL.TimezoneService.get('America/New_York')!
      const b = Time.fromString('2014-07-20T12:00:00.000')
      b.zone = Timezone.localTimezone

      expect(!a.isDate)
      expect(!b.isDate)

      expect(a.compareDateOnlyTz(b, a.zone)).to.equal(0)
      expect(a.compareDateOnlyTz(b, b.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, a.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, b.zone)).to.equal(0)

      // Midday in New York is after midday UTC.
      expect(a.compare(b)).to.equal(1)
      expect(b.compare(a)).to.equal(-1)
    })

    it('two timezones', () => {
      const a = Time.fromString('2014-07-20T02:00:00.000')
      a.zone = ICAL.TimezoneService.get('America/New_York')!
      const b = Time.fromString('2014-07-19T23:00:00.000')
      b.zone = ICAL.TimezoneService.get('America/Los_Angeles')!

      expect(!a.isDate)
      expect(!b.isDate)

      expect(a.compareDateOnlyTz(b, a.zone)).to.equal(0)
      expect(a.compareDateOnlyTz(b, b.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, a.zone)).to.equal(0)
      expect(b.compareDateOnlyTz(a, b.zone)).to.equal(0)
      expect(a.compare(b)).to.equal(0)
      expect(b.compare(a)).to.equal(0)

      a.isDate = true
      b.isDate = true

      expect(a.compareDateOnlyTz(b, a.zone)).to.equal(1)
      expect(a.compareDateOnlyTz(b, b.zone)).to.equal(1)
      expect(b.compareDateOnlyTz(a, a.zone)).to.equal(-1)
      expect(b.compareDateOnlyTz(a, b.zone)).to.equal(-1)
      expect(a.compare(b)).to.equal(1)
      expect(b.compare(a)).to.equal(-1)
    })
  })

  it('cache cleared', () => {
    // This test ensures the cached Unix time is cleared whenever the time is changed.
    const time = new Time({
      year: 2015,
      month: 4,
      day: 3,
      hour: 12,
      minute: 34,
      second: 56,
      timezone: Timezone.utcTimezone
    })

    expect(time.toUnixTime()).to.equal(1428064496)
    time.year++
    expect(time.toUnixTime()).to.equal(1459686896)
    time.month++
    expect(time.toUnixTime()).to.equal(1462278896)
    time.day++
    expect(time.toUnixTime()).to.equal(1462365296)
    time.hour++
    expect(time.toUnixTime()).to.equal(1462368896)
    time.minute++
    expect(time.toUnixTime()).to.equal(1462368956)
    time.second++
    expect(time.toUnixTime()).to.equal(1462368957)

    time.adjust(-397, -1, -1, -1)
    expect(time.toUnixTime()).to.equal(1428064496)

    time.resetTo(2016, 5, 4, 13, 35, 57)
    expect(time.toUnixTime()).to.equal(1462368957)

    // time.fromString('2015-04-03T12:34:56Z');
    // expect(time.toUnixTime()).to.equal(1428064496);

    time.fromJSDate(new Date(Date.UTC(2015, 0, 1)), true)
    expect(time.toUnixTime()).to.equal(1420070400)

    time.fromData({
      year: 2015,
      month: 4,
      day: 3,
      hour: 12,
      minute: 34,
      second: 56,
      timezone: Timezone.utcTimezone
    })
    expect(time.toUnixTime()).to.equal(1428064496)

    time.addDuration(ICAL.Duration.fromString('P1D'))
    expect(time.toUnixTime()).to.equal(1428150896)

    time.fromUnixTime(1234567890)
    expect(time.toUnixTime()).to.equal(1234567890)
  })

  describe('static functions', () => {
    it('daysInMonth', () => {
      expect(Time.daysInMonth(0, 2011)).to.equal(30)
      expect(Time.daysInMonth(2, 2012)).to.equal(29)
      expect(Time.daysInMonth(2, 2013)).to.equal(28)
      expect(Time.daysInMonth(13, 2014)).to.equal(30)
    })

    it('isLeapYear', () => {
      expect(Time.isLeapYear(1752)).to.be.true
      expect(Time.isLeapYear(2000)).to.be.true
      expect(Time.isLeapYear(2004)).to.be.true
      expect(Time.isLeapYear(2100)).to.be.false
    })

    it('fromDayOfYear', () => {
      expect(Time.fromDayOfYear(-730, 2001).toICALString()).to.equal('19990101')
      expect(Time.fromDayOfYear(-366, 2001).toICALString()).to.equal('19991231')
      expect(Time.fromDayOfYear(-365, 2001).toICALString()).to.equal('20000101')
      expect(Time.fromDayOfYear(0, 2001).toICALString()).to.equal('20001231')
      expect(Time.fromDayOfYear(365, 2001).toICALString()).to.equal('20011231')
      expect(Time.fromDayOfYear(366, 2001).toICALString()).to.equal('20020101')
      expect(Time.fromDayOfYear(730, 2001).toICALString()).to.equal('20021231')
      expect(Time.fromDayOfYear(731, 2001).toICALString()).to.equal('20030101')
      expect(Time.fromDayOfYear(1095, 2001).toICALString()).to.equal('20031231')
      expect(Time.fromDayOfYear(1096, 2001).toICALString()).to.equal('20040101')
      expect(Time.fromDayOfYear(1461, 2001).toICALString()).to.equal('20041231')
      expect(Time.fromDayOfYear(1826, 2001).toICALString()).to.equal('20051231')
    })

    it('fromStringv2', () => {
      const subject = Time.fromStringv2('2015-01-01')
      const expected = {
        year: 2015,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        isDate: true,
        timezone: 'floating'
      }

      expect(
        subject.toJSON()).to.deep.equal(expected
      )
    })

    describe('weekOneStarts', () => {
      function testWeekOne(year, dates, only?: boolean) {
        const dom = ICAL.Time.getDominicalLetter(year);
        (only ? it.only : it)(year + ' (' + dom + ')', () => {
          for (const wkday in dates) {
            const icalwkday = ICAL.Time[wkday]
            const w1st = Time.weekOneStarts(year, icalwkday)
            expect(dates[wkday]).to.equal(w1st.toString(), wkday)

            const startOfWeek = ICAL.Time.fromString(dates[wkday])
            expect(startOfWeek.weekNumber(icalwkday)).to.equal(1, wkday)
            startOfWeek.day--
            expect(startOfWeek.weekNumber(icalwkday)).to.be.above(51, wkday)
          }
        })
      }
      testWeekOne.only = function (year, dates) {
        testWeekOne(year, dates, true)
      }

      it('default week start', () => {
        const w1st = Time.weekOneStarts(1989)
        expect('1989-01-02').to.equal(w1st.toString())
      })

      testWeekOne(1989, { // A and AG
        SUNDAY: '1989-01-01', MONDAY: '1989-01-02', TUESDAY: '1989-01-03',
        WEDNESDAY: '1989-01-04', THURSDAY: '1989-01-05', FRIDAY: '1988-12-30',
        SATURDAY: '1988-12-31'
      })
      testWeekOne(1994, { // B and BA
        SUNDAY: '1994-01-02', MONDAY: '1994-01-03', TUESDAY: '1994-01-04',
        WEDNESDAY: '1994-01-05', THURSDAY: '1994-01-06', FRIDAY: '1993-12-31',
        SATURDAY: '1994-01-01'
      })
      testWeekOne(1993, { // C and CB
        SUNDAY: '1993-01-03', MONDAY: '1993-01-04', TUESDAY: '1993-01-05',
        WEDNESDAY: '1993-01-06', THURSDAY: '1993-01-07', FRIDAY: '1993-01-01',
        SATURDAY: '1993-01-02'
      })
      testWeekOne(1998, { // D and DC
        SUNDAY: '1997-12-28', MONDAY: '1997-12-29', TUESDAY: '1997-12-30',
        WEDNESDAY: '1997-12-31', THURSDAY: '1998-01-01', FRIDAY: '1997-12-26',
        SATURDAY: '1997-12-27'
      })
      testWeekOne(1997, { // E and ED
        SUNDAY: '1996-12-29', MONDAY: '1996-12-30', TUESDAY: '1996-12-31',
        WEDNESDAY: '1997-01-01', THURSDAY: '1997-01-02', FRIDAY: '1996-12-27',
        SATURDAY: '1996-12-28'
      })
      testWeekOne(1991, { // F and FE
        SUNDAY: '1990-12-30', MONDAY: '1990-12-31', TUESDAY: '1991-01-01',
        WEDNESDAY: '1991-01-02', THURSDAY: '1991-01-03', FRIDAY: '1990-12-28',
        SATURDAY: '1990-12-29'
      })
      testWeekOne(1990, { // G and GF
        SUNDAY: '1989-12-31', MONDAY: '1990-01-01', TUESDAY: '1990-01-02',
        WEDNESDAY: '1990-01-03', THURSDAY: '1990-01-04', FRIDAY: '1989-12-29',
        SATURDAY: '1989-12-30'
      })
    })
  })
})
