import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it } from 'mocha'

describe('timezone', function () {
  let icsData: string
  let timezone: ical.Timezone

  function timezoneTest(tzid: string, should: string, callback: () => void) {
    describe(tzid, async () => {
      if (tzid === 'UTC') {
        timezone = ICAL.Timezone.utcTimezone
      } else if (tzid === 'floating') {
        timezone = ICAL.Timezone.localTimezone
      } else {
        icsData = await defineSample('timezones/' + tzid + '.ics')
        const parsed = ICAL.parse(icsData)
        const vcalendar = new ICAL.Component(parsed)
        const comp = vcalendar.getFirstSubcomponent('vtimezone')

        timezone = new ICAL.Timezone(comp)
      }

      it(should, callback)
    })
  }

  function utcHours(time) {
    const seconds = timezone.utcOffset(new ICAL.Time(time))
    // in hours
    return (seconds / 3600)
  }

  const sanityChecks = [
    {
      // just before US DST
      time: { year: 2012, month: 3, day: 11, hour: 1, minute: 59 },
      offsets: {
        'America/Los_Angeles': -8,
        'America/New_York': -5,
        'America/Denver': -7,
        'America/Atikokan': -5, // single tz
        'UTC': 0,
        'floating': 0
      }
    },

    {
      // just after US DST
      time: { year: 2012, month: 3, day: 11, hour: 2 },
      offsets: {
        'America/Los_Angeles': -7,
        'America/Denver': -6,
        'America/New_York': -4,
        'America/Atikokan': -5,
        'UTC': 0,
        'floating': 0
      }
    },

    {
      time: { year: 2004, month: 10, day: 31, hour: 0, minute: 59, second: 59 },
      offsets: {
        'America/Denver': -6
      }
    },

    {
      time: { year: 2004, month: 10, day: 31, hour: 1 },
      offsets: {
        'America/Denver': -7
      }
    },


    // Edge case timezone that defines an RDATE with VALUE=DATE
    {
      // just before DST
      time: { year: 1980, month: 1, day: 1, hour: 0, minute: 59 },
      offsets: {
        'Makebelieve/RDATE_test': -4,
        'Makebelieve/RDATE_utc_test': -5
      }
    },

    {
      // just after DST
      time: { year: 1980, month: 1, day: 1, hour: 1 },
      offsets: {
        'Makebelieve/RDATE_test': -5,
        'Makebelieve/RDATE_utc_test': -5
      }
    },

    // Edge case where RDATE is defined in UTC
    {
      // just before DST
      time: { year: 1990, month: 1, day: 1, hour: 0, minute: 59 },
      offsets: {
        'Makebelieve/RDATE_test': -4,
        'Makebelieve/RDATE_utc_test': -4
      }
    },

    {
      // just after DST
      time: { year: 1990, month: 1, day: 1, hour: 2 },
      offsets: {
        'Makebelieve/RDATE_test': -5,
        'Makebelieve/RDATE_utc_test': -5
      }
    },

    // Edge case timezone where an RRULE with UNTIL in UTC is specified
    {
      // Just before DST
      time: { year: 1975, month: 1, day: 1, hour: 1, minute: 0, second: 0 },
      offsets: {
        'Makebelieve/RRULE_UNTIL_test': -5
      }
    },
    {
      // Just after DST
      time: { year: 1975, month: 1, day: 1, hour: 3, minute: 0, second: 0 },
      offsets: {
        'Makebelieve/RRULE_UNTIL_test': -4
      }
    },
    {
      // After the RRULE ends
      time: { year: 1985, month: 1, day: 1, hour: 3, minute: 0, second: 0 },
      offsets: {
        'Makebelieve/RRULE_UNTIL_test': -4
      }
    }
  ]

  // simple format checks
  sanityChecks.forEach(function (item) {
    const title = 'time: ' + JSON.stringify(item.time)

    describe(title, () => {
      for (const tzid in item.offsets) {
        timezoneTest(tzid, tzid + ' offset ' + item.offsets[tzid], function (tzid) {
          expect(
            utcHours(item.time)).to.equal(
            item.offsets[tzid]
          )
        }.bind(this, tzid))
      }
    })
  })

  timezoneTest('America/Los_Angeles', '#expandedUntilYear', function () {

    function calcYear(yr: number) {
      return Math.max(ICAL.Timezone._minimumExpansionYear, yr) +
        ICAL.Timezone.EXTRA_COVERAGE
    }

    let time = new ICAL.Time({
      year: 2012,
      timezone: timezone
    })
    let expectedCoverage = calcYear(time.year)

    time.utcOffset()
    expect(timezone['expandedUntilYear']).to.equal(expectedCoverage)

    time = new ICAL.Time({
      year: 2014,
      timezone: timezone
    })

    time.utcOffset()
    expect(timezone['expandedUntilYear']).to.equal(expectedCoverage)

    time = new ICAL.Time({
      year: 1997,
      timezone: timezone
    })
    time.utcOffset()
    expect(timezone['expandedUntilYear']).to.equal(expectedCoverage)

    time = new ICAL.Time({
      year: expectedCoverage + 3,
      timezone: timezone
    })
    expectedCoverage = calcYear(time.year)
    time.utcOffset()
    expect(timezone['expandedUntilYear']).to.equal(expectedCoverage)

    time = new ICAL.Time({
      year: ICAL.Timezone.MAX_YEAR + 1,
      timezone: timezone
    })
    time.utcOffset()
    expect(timezone['expandedUntilYear']).to.equal(ICAL.Timezone.MAX_YEAR)
  })

  describe('#convertTime', function () {
    timezoneTest('America/Los_Angeles', 'convert date-time from utc', function () {
      const subject = ICAL.Time.fromString('2012-03-11T01:59:00Z')
      const subject2 = subject.convertToZone(timezone)
      expect(subject2.zone.tzid).to.equal(timezone.tzid)
      expect(subject2.toString()).to.equal('2012-03-10T17:59:00')
    })

    timezoneTest('America/Los_Angeles', 'convert date from utc', function () {
      const subject = ICAL.Time.fromString('2012-03-11')
      const subject2 = subject.convertToZone(timezone)
      expect(subject2.zone.tzid).to.equal(timezone.tzid)
      expect(subject2.toString()).to.equal('2012-03-11')
    })
    timezoneTest('America/Los_Angeles', 'convert local time to zone', function () {
      const subject = ICAL.Time.fromString('2012-03-11T01:59:00')
      subject.zone = ICAL.Timezone.localTimezone
      expect(subject.toString()).to.equal('2012-03-11T01:59:00')

      const subject2 = subject.convertToZone(timezone)
      expect(subject2.toString()).to.equal('2012-03-11T01:59:00')

      const subject3 = subject2.convertToZone(ICAL.Timezone.localTimezone)
      expect(subject3.toString()).to.equal('2012-03-11T01:59:00')
    })
  })

  describe('#fromData', function () {
    timezoneTest('America/Los_Angeles', 'string component', function () {
      const subject = new ICAL.Timezone({
        component: timezone.component.toString(),
        tzid: 'Makebelieve/Different'
      })

      expect(subject['expandedUntilYear']).to.equal(0)
      expect(subject.tzid).to.equal('Makebelieve/Different')
      expect(subject.component.getFirstPropertyValue('tzid')).to.equal('America/Los_Angeles')
    })

    timezoneTest('America/Los_Angeles', 'component in data', () => {
      const subject = new ICAL.Timezone({
        component: timezone.component,
      })

      expect(subject.tzid).to.equal('America/Los_Angeles')
      expect(subject.component).to.deep.equal(timezone.component)
    })

    timezoneTest('America/Los_Angeles', 'with strange component', () => {
      const subject = new ICAL.Timezone({ component: 123 as any })

      expect(subject.component).to.be.null
    })
  })

  describe('#utcOffset', () => {
    it('empty vtimezone', () => {
      const subject = new ICAL.Timezone({
        component: new ICAL.Component('vtimezone')
      })

      expect(subject.utcOffset(ICAL.Time.fromString('2012-01-01'))).to.equal(0)
    })

    it('empty STANDARD/DAYLIGHT', () => {
      const subject = new ICAL.Timezone({
        component: new ICAL.Component(['vtimezone', [], [
          ['standard', [], []],
          ['daylight', [], []]
        ]])
      })

      expect(subject.utcOffset(ICAL.Time.fromString('2012-01-01'))).to.equal(0)
    })
  })

  describe('#toString', () => {
    timezoneTest('America/Los_Angeles', 'toString', () => {
      expect(timezone.toString()).to.equal('America/Los_Angeles')
      expect(timezone.tzid).to.equal('America/Los_Angeles')
      expect(timezone.tznames).to.equal('')

      timezone.tznames = 'test'
      expect(timezone.toString()).to.equal('test')
      expect(timezone.tzid).to.equal('America/Los_Angeles')
      expect(timezone.tznames).to.equal('test')
    })
  })

  it('#_compare_change_fn', () => {
    const subject = ICAL.Timezone._compare_change_fn

    const a = new ICAL.Time({
      year: 2015,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      second: 30
    })

    function vary(prop) {
      const b = a.clone()
      expect(subject(a, b)).to.equal(0)
      b[prop] += 1
      expect(subject(a, b)).to.equal(-1)
      b[prop] -= 2
      expect(subject(a, b)).to.equal(1)
    }

    ['year', 'month', 'day', 'hour', 'minute', 'second'].forEach(vary)
  })
})
