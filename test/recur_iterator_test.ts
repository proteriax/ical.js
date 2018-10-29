import { getICAL } from './ical'
import { expect } from 'chai'
import { describe, it } from 'mocha'

const ICAL = getICAL()
const { Time, Recur, RecurIterator } = ICAL

describe('recur_iterator', () => {
  describe('#toJSON', () => {
    const start = Time.fromString('2012-02-01T09:00:00')
    const recur = Recur.fromString('FREQ=MONTHLY;COUNT=12;INTERVAL=3')
    const getIterator = () => recur.iterator(start)

    it('completed', () => {
      const iterator = getIterator()
      while (iterator.next()) {}

      expect(iterator.completed, 'is completed').to.be.true

      const json = iterator.toJSON()
      const newIter = new RecurIterator(json)

      expect(newIter.next(), 'new iter next').to.not.exist
      expect(newIter.completed, 'new iter completed').to.be.true
    })

    it('INTERVAL: mid iteration (two iterations)', () => {
      const iterator = getIterator()
      iterator.next()
      iterator.next()

      const json = iterator.toJSON()
      const newIter = new RecurIterator(json)
      let inc = 0

      while (inc++ < 8) {
        expect(iterator.next()!.toJSDate()).to.deep.equal(
          newIter.next()!.toJSDate(),
          'failed #' + inc
        )
      }
    })

    it('from the begining of iteration', () => {
      const iterator = getIterator()
      const expected = {
        rule: iterator.rule.toJSON(),
        dtstart: iterator.dtstart.toJSON(),
        by_data: (iterator as any).by_data,
        days: (iterator as any).days,
        initialized: true,
        last: iterator.last.toJSON(),
        by_indices: (iterator as any).by_indices,
        occurrence_number: iterator.occurrence_number
      }

      const json = iterator.toJSON()
      expect(json).to.deep.equal(expected)

      const newIter = new RecurIterator(json)
      let inc = 0

      while (inc++ < 10) {
        expect(+newIter.next()!.toJSDate()).to.equal(
          +iterator.next()!.toJSDate(),
          'iterator equality #' + inc
        )
      }
    })

  })

  describe('#normalizeByMonthDayRules', () => {
    const start = Time.fromString('2012-02-01T09:00:00')
    const recur = Recur.fromString('FREQ=MONTHLY;COUNT=2')
    const iterator = recur.iterator(start)

    it('positive rules', () => {
      const result = iterator.normalizeByMonthDayRules(2012, 2, [21, 15])
      expect(result).to.deep.equal([15, 21])
    })

    it('when given zero', () => {
      const result = iterator.normalizeByMonthDayRules(2012, 2, [21, 0])
      expect(result).to.deep.equal([21])
    })

    it('extra days', () => {
      const result = iterator.normalizeByMonthDayRules(2012, 2, [1, 31])
      expect(result).to.deep.equal([1])
    })

    it('negative and positive days', () => {
      const result = iterator.normalizeByMonthDayRules(2012, 2, [1, -1])
      expect(result).to.deep.equal([1, 29])
    })

    it('duplicates', () => {
      const result = iterator.normalizeByMonthDayRules(
        // -29 === 1st day
        2012, 2, [2, 2, 1, -29]
      )
      expect(result).to.deep.equal([1, 2])
    })
  })

  interface RuleOptions {
    only?: boolean
    until?: boolean
    byCount?: boolean
    dtStart?: string
    max?: number
    dates: string[]
  }
  function testRRULE(ruleString: string, options: RuleOptions) {
    const runner = options.only ? it.only : it
    runner(ruleString, () => {
      if (!options.dtStart) {
        options.dtStart = options.dates[0]
      }

      const start = Time.fromString(options.dtStart)
      const recur = Recur.fromString(ruleString)
      const iterator = recur.iterator(start)

      let inc = 0
      const dates: string[] = []
      let next, max

      if ('max' in options) {
        max = options.max
      } else if (recur.isFinite()) {
        max = options.dates.length + 1
      } else {
        max = options.dates.length
      }

      expect(recur.isFinite()).to.equal(options.byCount || options.until || false)
      expect(recur.isByCount()).to.equal(options.byCount || false)

      while (inc++ < max && (next = iterator.next())) {
        dates.push(next.toString())
      }
      expect(dates).to.deep.equal(options.dates || [])
    })
  }
  testRRULE.only = function (ruleString: string, options: RuleOptions) {
    options.only = true
    testRRULE(ruleString, options)
  }

  describe('#recurrence rules', () => {
    describe('SECONDLY/MINUTELY/HOURLY', () => {
      // Simple secondly
      testRRULE('FREQ=SECONDLY;INTERVAL=3;COUNT=3', {
        byCount: true,
        dates: [
          '2015-04-30T08:00:00',
          '2015-04-30T08:00:03',
          '2015-04-30T08:00:06',
        ],
      })

      // Simple minutely
      testRRULE('FREQ=MINUTELY;INTERVAL=3;COUNT=3', {
        byCount: true,
        dates: [
          '2015-04-30T08:00:00',
          '2015-04-30T08:03:00',
          '2015-04-30T08:06:00',
        ],
      })

      // simple hourly
      testRRULE('FREQ=HOURLY;INTERVAL=3;COUNT=3', {
        byCount: true,
        dates: [
          '2015-04-30T08:00:00',
          '2015-04-30T11:00:00',
          '2015-04-30T14:00:00',
        ],
      })
    })

    describe('DAILY', () => {
      // daily for 10 occurrences'
      testRRULE('FREQ=DAILY;COUNT=10', {
        byCount: true,
        dates: [
          '2012-09-01T09:00:00',
          '2012-09-02T09:00:00',
          '2012-09-03T09:00:00',
          '2012-09-04T09:00:00',
          '2012-09-05T09:00:00',
          '2012-09-06T09:00:00',
          '2012-09-07T09:00:00',
          '2012-09-08T09:00:00',
          '2012-09-09T09:00:00',
          '2012-09-10T09:00:00',
        ],
      })

      // every other day - forever
      testRRULE('FREQ=DAILY;INTERVAL=2', {
        dates: [
          '2012-09-01T09:00:00',
          '2012-09-03T09:00:00',
          '2012-09-05T09:00:00',
          '2012-09-07T09:00:00',
          '2012-09-09T09:00:00',
          '2012-09-11T09:00:00',
          '2012-09-13T09:00:00',
          '2012-09-15T09:00:00',
          '2012-09-17T09:00:00',
          '2012-09-19T09:00:00',
        ],
      })

      // every 10 days, 5 occurrences
      testRRULE('FREQ=DAILY;INTERVAL=10;COUNT=5', {
        byCount: true,
        dates: [
          '2012-09-01T09:00:00',
          '2012-09-11T09:00:00',
          '2012-09-21T09:00:00',
          '2012-10-01T09:00:00',
          '2012-10-11T09:00:00',
        ],
      })

      // daily on weekdays',
      testRRULE('FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR', {
        dates: [
          '2012-01-02T09:00:00',
          '2012-01-03T09:00:00',
          '2012-01-04T09:00:00',
          '2012-01-05T09:00:00',
          '2012-01-06T09:00:00',
          '2012-01-09T09:00:00',
          '2012-01-10T09:00:00',
          '2012-01-11T09:00:00',
          '2012-01-12T09:00:00',
          '2012-01-13T09:00:00',
        ],
      })
    })

    describe('WEEKLY', () => {
      // weekly until
      testRRULE('FREQ=WEEKLY;UNTIL=20120424T065959Z;BYDAY=TU', {
        until: true,
        dates: [
          '2012-04-10T09:00:00',
          '2012-04-17T09:00:00',
        ],
      })
      // weekly for 10 occurrences
      testRRULE('FREQ=WEEKLY;COUNT=10', {
        byCount: true,
        dates: [
          '2012-01-05T09:00:00',
          '2012-01-12T09:00:00',
          '2012-01-19T09:00:00',
          '2012-01-26T09:00:00',
          '2012-02-02T09:00:00',
          '2012-02-09T09:00:00',
          '2012-02-16T09:00:00',
          '2012-02-23T09:00:00',
          '2012-03-01T09:00:00',
          '2012-03-08T09:00:00',
        ],
      })

      // Weekly until December 24, 2012'
      testRRULE('FREQ=WEEKLY;UNTIL=20121224T000000Z', {
        until: true,
        dates: [
          '2012-11-15T00:00:00',
          '2012-11-22T00:00:00',
          '2012-11-29T00:00:00',
          '2012-12-06T00:00:00',
          '2012-12-13T00:00:00',
          '2012-12-20T00:00:00',
        ],
      })

      // every other week forever'
      testRRULE('FREQ=WEEKLY;INTERVAL=2;WKST=SU', {
        dates: [
          '2012-01-15T09:00:00',
          '2012-01-29T09:00:00',
          '2012-02-12T09:00:00',
        ],
      })

      // weekly on tuesday and thursday for five weeks
      testRRULE('FREQ=WEEKLY;COUNT=4;WKST=SU;BYDAY=TU,TH', {
        dtStart: '2012-01-01T09:00:00',
        byCount: true,
        dates: [
          '2012-01-03T09:00:00',
          '2012-01-05T09:00:00',
          '2012-01-10T09:00:00',
          '2012-01-12T09:00:00',
        ],
      })

      // every other week on mo,we,fi until dec 24th 1997
      testRRULE('FREQ=WEEKLY;INTERVAL=2;UNTIL=19971224T090000Z;WKST=SU;BYDAY=MO,WE,FR', {
        until: true,
        dates: [
          '1997-09-01T09:00:00', '1997-09-03T09:00:00', '1997-09-05T09:00:00',
          '1997-09-15T09:00:00', '1997-09-17T09:00:00', '1997-09-19T09:00:00',
          '1997-09-29T09:00:00', '1997-10-01T09:00:00', '1997-10-03T09:00:00',
          '1997-10-13T09:00:00', '1997-10-15T09:00:00', '1997-10-17T09:00:00',
          '1997-10-27T09:00:00', '1997-10-29T09:00:00', '1997-10-31T09:00:00',
          '1997-11-10T09:00:00', '1997-11-12T09:00:00', '1997-11-14T09:00:00',
          '1997-11-24T09:00:00', '1997-11-26T09:00:00', '1997-11-28T09:00:00',
          '1997-12-08T09:00:00', '1997-12-10T09:00:00', '1997-12-12T09:00:00',
          '1997-12-22T09:00:00', '1997-12-24T09:00:00',
        ],
      })

      /* TODO byweekno is not well supported
      testRRULE('FREQ=WEEKLY;BYWEEKNO=2,4,6', {
        dates: [
          '2015-01-11T08:00:00', // TODO the first occurrence is given twice
          '2015-01-12T08:00:00', '2015-01-26T08:00:00', '2015-02-09T08:00:00',
          '2016-01-11T08:00:00', '2016-01-25T08:00:00', '2016-02-08T08:00:00',
        ],
      });
      */

      // weekly WKST changes output'
      // MO
      testRRULE('FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO', {
        byCount: true,
        dates: [
          '1997-08-05T09:00:00',
          '1997-08-10T09:00:00',
          '1997-08-19T09:00:00',
          '1997-08-24T09:00:00',
        ],
      })

      // 'weekly WKST changes output'
      // SU
      testRRULE('FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=SU', {
        byCount: true,
        dates: [
          '1997-08-05T09:00:00',
          '1997-08-17T09:00:00',
          '1997-08-19T09:00:00',
          '1997-08-31T09:00:00',
        ],
      })

      // weekly on tuesday
      testRRULE('FREQ=WEEKLY;BYDAY=TU', {
        dates: [
          '2012-09-11T09:00:00',
          '2012-09-18T09:00:00',
          '2012-09-25T09:00:00',
          '2012-10-02T09:00:00',
          '2012-10-09T09:00:00',
        ],
      })

      // buisness days for 31 occurances'
      testRRULE('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', {
        dates: [
          '2012-01-02T09:00:00', '2012-01-03T09:00:00', '2012-01-04T09:00:00', '2012-01-05T09:00:00', '2012-01-06T09:00:00',
          '2012-01-09T09:00:00', '2012-01-10T09:00:00', '2012-01-11T09:00:00', '2012-01-12T09:00:00', '2012-01-13T09:00:00',
          '2012-01-16T09:00:00', '2012-01-17T09:00:00', '2012-01-18T09:00:00', '2012-01-19T09:00:00', '2012-01-20T09:00:00',
          '2012-01-23T09:00:00', '2012-01-24T09:00:00', '2012-01-25T09:00:00', '2012-01-26T09:00:00', '2012-01-27T09:00:00',
          '2012-01-30T09:00:00', '2012-01-31T09:00:00', '2012-02-01T09:00:00', '2012-02-02T09:00:00', '2012-02-03T09:00:00',
          '2012-02-06T09:00:00', '2012-02-07T09:00:00', '2012-02-08T09:00:00', '2012-02-09T09:00:00', '2012-02-10T09:00:00',
          '2012-02-13T09:00:00',
        ],
      })
    })

    describe('MONTHLY', () => {
      // monthly on first friday for 10 occurrences
      testRRULE('FREQ=MONTHLY;COUNT=10;BYDAY=1FR', {
        dtStart: '2012-01-07T00:00:00',
        byCount: true,
        dates: [
          '2012-02-03T00:00:00',
          '2012-03-02T00:00:00',
          '2012-04-06T00:00:00',
          '2012-05-04T00:00:00',
          '2012-06-01T00:00:00',
          '2012-07-06T00:00:00',
          '2012-08-03T00:00:00',
          '2012-09-07T00:00:00',
          '2012-10-05T00:00:00',
          '2012-11-02T00:00:00',
        ],
      })

      // every thursday 31th forever'
      testRRULE('FREQ=MONTHLY;BYDAY=TH;BYMONTHDAY=31', {
        dtStart: '2012-01-31T09:00:00',
        dates: [
          '2012-05-31T09:00:00',
          '2013-01-31T09:00:00',
          '2013-10-31T09:00:00',
        ],
      })

      // every other month; first and last sunday for 4 occurrences
      testRRULE('FREQ=MONTHLY;INTERVAL=2;COUNT=4;BYDAY=1SU,-1SU', {
        dtStart: '2012-11-01T09:00:00',
        byCount: true,
        dates: [
          '2012-11-04T09:00:00',
          '2012-11-25T09:00:00',
          '2013-01-06T09:00:00',
          '2013-01-27T09:00:00',
        ],
      })

      // monthly third to last day of month forever
      testRRULE('FREQ=MONTHLY;BYMONTHDAY=-3', {
        dtStart: '2012-01-01T09:00:00',
        dates: [
          '2012-01-29T09:00:00',
          '2012-02-27T09:00:00',
          '2012-03-29T09:00:00',
        ],
      })


      // monthly, the third instance of tu,we,th
      testRRULE('FREQ=MONTHLY;COUNT=3;BYDAY=TU,WE,TH;BYSETPOS=3', {
        byCount: true,
        dates: [
          '1997-09-04T09:00:00',
          '1997-10-07T09:00:00',
          '1997-11-06T09:00:00',
        ],
      })

      // monthly, each month last day that is monday
      testRRULE('FREQ=MONTHLY;BYMONTHDAY=-1;BYDAY=MO', {
        dtStart: '2012-01-01T09:00:00',
        dates: [
          '2012-04-30T09:00:00',
          '2012-12-31T09:00:00',
        ],
      })

      // every friday 13th forever'
      testRRULE('FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13', {
        dtStart: '2012-04-01T09:00:00',
        dates: [
          '2012-04-13T09:00:00',
          '2012-07-13T09:00:00',
          '2013-09-13T09:00:00',
        ],
      })

      // 'Every 11th & 31st every month'
      testRRULE('FREQ=MONTHLY;BYMONTHDAY=11,31', {
        dtStart: '2013-04-01T08:00:00',
        dates: [
          '2013-04-11T08:00:00',
          '2013-05-11T08:00:00',
          '2013-05-31T08:00:00',
          '2013-06-11T08:00:00',
          '2013-07-11T08:00:00',
          '2013-07-31T08:00:00',
        ],
      })

      // Every WE & SA the 6th, 20th & 31st every month
      testRRULE('FREQ=MONTHLY;BYDAY=WE,SA;BYMONTHDAY=6,20,31', {
        dtStart: '2013-07-01T08:00:00',
        dates: [
          '2013-07-06T08:00:00',
          '2013-07-20T08:00:00',
          '2013-07-31T08:00:00',
          '2013-08-31T08:00:00',
          '2013-11-06T08:00:00',
          '2013-11-20T08:00:00',
        ],
      })

      // monthly, on the 3rd, BYMONTHDAY not set
      testRRULE('FREQ=MONTHLY', {
        dates: [
          '2013-04-03T08:00:00',
          '2013-05-03T08:00:00',
          '2013-06-03T08:00:00',
          '2013-07-03T08:00:00',
          '2013-08-03T08:00:00',
          '2013-09-03T08:00:00',
        ],
      })

      // monthly, on the 31st, BYMONTHDAY not set
      testRRULE('FREQ=MONTHLY', {
        dates: [
          '2013-01-31T08:00:00',
          '2013-03-31T08:00:00',
          '2013-05-31T08:00:00',
          '2013-07-31T08:00:00',
          '2013-08-31T08:00:00',
          '2013-10-31T08:00:00',
        ],
      })

      // Repeat Monthly every Wednesday, Friday and the third Monday
      testRRULE('FREQ=MONTHLY;BYDAY=3MO,WE,FR', {
        dates: [
          '2015-01-02T08:00:00',
          '2015-01-07T08:00:00',
          '2015-01-09T08:00:00',
          '2015-01-14T08:00:00',
          '2015-01-16T08:00:00',
          '2015-01-19T08:00:00',
          '2015-01-21T08:00:00',
          '2015-01-23T08:00:00',
        ]})

      // Repeat Monthly, the fifth Saturday (BYDAY=5SA)
      testRRULE('FREQ=MONTHLY;BYDAY=5SA', {
        dtStart: '2015-02-04T08:00:00',
        dates: [
          '2015-05-30T08:00:00',
          '2015-08-29T08:00:00',
          '2015-10-31T08:00:00',
          '2016-01-30T08:00:00',
          '2016-04-30T08:00:00',
          '2016-07-30T08:00:00',
       ],
     })

      // Repeat Monthly, the fifth Wednesday every two months (BYDAY=5WE)
      testRRULE('FREQ=MONTHLY;INTERVAL=2;BYDAY=5WE', {
        dtStart: '2015-01-01T08:00:00',
        dates: [
          '2015-07-29T08:00:00',
          '2015-09-30T08:00:00',
          '2016-03-30T08:00:00',
          '2016-11-30T08:00:00',
          '2017-03-29T08:00:00',
          '2017-05-31T08:00:00',
        ],
      })

      // Repeat Monthly, the 2nd Monday, 5th Wednesday and the 5th to last Saturday every month
      testRRULE('FREQ=MONTHLY;BYDAY=2MO,-5WE,5SA', {
        dates: [
          '2015-04-01T08:00:00',
          '2015-04-13T08:00:00',
          '2015-05-11T08:00:00',
          '2015-05-30T08:00:00',
          '2015-06-08T08:00:00',
          '2015-07-01T08:00:00',
          '2015-07-13T08:00:00',
        ],
      })

      // from rfc -> the last work day of the month
      testRRULE('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1', {
        dates: [
          '2015-06-30T08:00:00',
          '2015-07-31T08:00:00',
          '2015-08-31T08:00:00',
          '2015-09-30T08:00:00',
          '2015-10-30T08:00:00',
          '2015-11-30T08:00:00',
        ],
      })

      // BYMONTHDAY
      testRRULE('FREQ=MONTHLY;BYMONTHDAY=1', {
        dates: [
          '2015-01-01T08:00:00',
          '2015-02-01T08:00:00',
          '2015-03-01T08:00:00',
        ],
      })

      // monthly, bymonthday
      testRRULE('FREQ=MONTHLY;BYMONTHDAY=-1', {
        dtStart: '2015-01-01T08:00:00',
        dates: [
          '2015-01-31T08:00:00',
          '2015-02-28T08:00:00',
          '2015-03-31T08:00:00',
        ],
      })

      // monthly + by month
      testRRULE('FREQ=MONTHLY;BYMONTH=1,3,6,9,12', {
        dates: [
          '2015-01-01T08:00:00',
          '2015-03-01T08:00:00',
          '2015-06-01T08:00:00',
          '2015-09-01T08:00:00',
          '2015-12-01T08:00:00',
        ],
      })

      testRRULE('FREQ=MONTHLY;BYDAY=MO,FR;BYMONTHDAY=1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31;COUNT=4', {
        dtStart: '2015-03-01T08:00:00Z',
        byCount: true,
        dates: [
          '2015-03-09T08:00:00Z',
          '2015-03-13T08:00:00Z',
          '2015-03-23T08:00:00Z',
          '2015-03-27T08:00:00Z',
        ],
      })
      testRRULE('FREQ=MONTHLY;BYDAY=MO,FR;BYMONTHDAY=1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31;COUNT=4', {
        dtStart: '2015-04-01T08:00:00Z',
        byCount: true,
        dates: [
          '2015-04-03T08:00:00Z',
          '2015-04-13T08:00:00Z',
          '2015-04-17T08:00:00Z',
          '2015-04-27T08:00:00Z',
        ],
      })
      testRRULE('FREQ=MONTHLY;BYDAY=MO,SA;BYMONTHDAY=1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31;COUNT=4', {
        dtStart: '2015-04-01T08:00:00Z',
        byCount: true,
        dates: [
          '2015-04-11T08:00:00Z',
          '2015-04-13T08:00:00Z',
          '2015-04-25T08:00:00Z',
          '2015-04-27T08:00:00Z',
        ],
      })
      testRRULE('FREQ=MONTHLY;BYDAY=SU,FR;BYMONTHDAY=1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31;COUNT=9', {
        dtStart: '2015-02-28T08:00:00Z',
        byCount: true,
        dates: [
          '2015-03-01T08:00:00Z',
          '2015-03-13T08:00:00Z',
          '2015-03-15T08:00:00Z',
          '2015-03-27T08:00:00Z',
          '2015-03-29T08:00:00Z',
          '2015-04-03T08:00:00Z',
          '2015-04-05T08:00:00Z',
          '2015-04-17T08:00:00Z',
          '2015-04-19T08:00:00Z',
        ],
      })
    })

    describe('YEARLY', () => {
      // yearly & by month with one by day
      testRRULE('FREQ=YEARLY;BYMONTH=3;BYDAY=TU', {
        dtStart: '1970-03-08T02:00:00',
        dates: ['1970-03-10T02:00:00']
      })

      // every monday in January, for 3 years
      testRRULE('FREQ=YEARLY;UNTIL=20150131T090000Z;BYMONTH=1;BYDAY=MO', {
        dtStart: '2012-05-01T09:00:00',
        until: true,
        dates: [
          '2013-01-07T09:00:00',
          '2013-01-14T09:00:00',
          '2013-01-21T09:00:00',
          '2013-01-28T09:00:00',
          '2014-01-06T09:00:00',
          '2014-01-13T09:00:00',
          '2014-01-20T09:00:00',
          '2014-01-27T09:00:00',
          '2015-01-05T09:00:00',
          '2015-01-12T09:00:00',
          '2015-01-19T09:00:00',
          '2015-01-26T09:00:00',
        ],
      })

      // Every year the last day of February (rule with BYMONTH)
      testRRULE('FREQ=YEARLY;BYMONTHDAY=-1;BYMONTH=2', {
        dates: [
          '2014-02-28T08:00:00',
          '2015-02-28T08:00:00',
          '2016-02-29T08:00:00',
          '2017-02-28T08:00:00',
          '2018-02-28T08:00:00',
          '2019-02-28T08:00:00',
        ],
      })

      // Every year the last day of April (rule without BYMONTH)
      testRRULE('FREQ=YEARLY;BYMONTHDAY=-1', {
        dates: [
          '2014-04-30T08:00:00',
          '2015-04-30T08:00:00',
          '2016-04-30T08:00:00',
          '2017-04-30T08:00:00',
          '2018-04-30T08:00:00',
          '2019-04-30T08:00:00',
        ],
      })

      // Yearly, every WE and FR of January and March (more BYMONTH and more BYDAY)
      testRRULE('FREQ=YEARLY;BYMONTH=1,3;BYDAY=WE,FR', {
        dates: [
          '2014-01-01T08:00:00', '2014-01-03T08:00:00',
          '2014-01-08T08:00:00', '2014-01-10T08:00:00',
          '2014-01-15T08:00:00', '2014-01-17T08:00:00',
          '2014-01-22T08:00:00', '2014-01-24T08:00:00',
          '2014-01-29T08:00:00', '2014-01-31T08:00:00',
          '2014-03-05T08:00:00', '2014-03-07T08:00:00',
          '2014-03-12T08:00:00', '2014-03-14T08:00:00',
          '2014-03-19T08:00:00', '2014-03-21T08:00:00',
          '2014-03-26T08:00:00', '2014-03-28T08:00:00',
        ],
      })

      // Yearly, every day of January (one BYMONTH and more BYDAY
      testRRULE('FREQ=YEARLY;BYMONTH=1;BYDAY=SU,MO,TU,WE,TH,FR,SA', {
        dates: [
          '2014-01-01T08:00:00',
          '2014-01-02T08:00:00',
          '2014-01-03T08:00:00',
          '2014-01-04T08:00:00',
          '2014-01-05T08:00:00',
          '2014-01-06T08:00:00',
          '2014-01-07T08:00:00',
          '2014-01-08T08:00:00',
          '2014-01-09T08:00:00',
          '2014-01-10T08:00:00',
          '2014-01-11T08:00:00',
          '2014-01-12T08:00:00',
          '2014-01-13T08:00:00',
          '2014-01-14T08:00:00',
          '2014-01-15T08:00:00',
          '2014-01-16T08:00:00',
          '2014-01-17T08:00:00',
          '2014-01-18T08:00:00',
          '2014-01-19T08:00:00',
          '2014-01-20T08:00:00',
          '2014-01-21T08:00:00',
          '2014-01-22T08:00:00',
          '2014-01-23T08:00:00',
          '2014-01-24T08:00:00',
          '2014-01-25T08:00:00',
          '2014-01-26T08:00:00',
          '2014-01-27T08:00:00',
          '2014-01-28T08:00:00',
          '2014-01-29T08:00:00',
          '2014-01-30T08:00:00',
          '2014-01-31T08:00:00',
          '2015-01-01T08:00:00',
        ],
      })
      // yearly, byMonth, byweekNo
      /* TODO BYWEEKNO is not well supported
      testRRULE('FREQ=YEARLY;BYMONTH=6,9;BYWEEKNO=23', {
        dates: [
          '2015-06-08T08:00:00',
          '2016-06-06T08:00:00',
          '2017-06-05T08:00:00',
          '2018-06-04T08:00:00',
        ],
      });

      //yearly, byMonth, byweekNo negative
      testRRULE('FREQ=YEARLY;BYMONTH=6,9;BYWEEKNO=-28', {
        dates: [
          '2015-06-15T08:00:00',
          '2016-06-06T08:00:00',
          '2017-06-05T08:00:00',
          '2018-06-04T08:00:00',
        ],
      });
      //yearly, negative byweekNo, negative bymonthday
      testRRULE('FREQ=YEARLY;BYMONTHDAY=-27,-26,-25,-24,-23;BYWEEKNO=-28', {
        dates: [
          '2016-06-06T08:00:00',
          '2016-06-07T08:00:00',
          '2016-06-08T08:00:00',
          '2017-06-05T08:00:00',
          '2017-06-06T08:00:00',
          '2017-06-07T08:00:00',
          '2017-06-08T08:00:00',
          '2018-06-04T08:00:00',
          '2018-06-05T08:00:00',
          '2018-06-06T08:00:00',
          '2018-06-07T08:00:00',
          '2018-06-08T08:00:00',
        ],
      });

      //yearly, byweekNo, bymonthday
      testRRULE('FREQ=YEARLY;BYMONTHDAY=4,5,6,7,8;BYWEEKNO=23', {
        dates: [
          '2015-06-08T08:00:00',
          '2016-06-06T08:00:00',
          '2016-06-07T08:00:00',
          '2016-06-08T08:00:00',
          '2017-06-05T08:00:00',
          '2017-06-06T08:00:00',
          '2017-06-07T08:00:00',
          '2017-06-08T08:00:00',
          '2018-06-04T08:00:00',
          '2018-06-05T08:00:00',
          '2018-06-06T08:00:00',
          '2018-06-07T08:00:00',
          '2018-06-08T08:00:00',
        ],
      });

      //yearly, negative byweekNo, bymonthday
      testRRULE('FREQ=YEARLY;BYMONTHDAY=4,5,6,7,8;BYWEEKNO=-28', {
        dates: [
          '2016-06-06T08:00:00',
          '2016-06-07T08:00:00',
          '2016-06-08T08:00:00',
          '2017-06-05T08:00:00',
          '2017-06-06T08:00:00',
          '2017-06-07T08:00:00',
          '2017-06-08T08:00:00',
          '2018-06-04T08:00:00',
          '2018-06-05T08:00:00',
          '2018-06-06T08:00:00',
          '2018-06-07T08:00:00',
          '2018-06-08T08:00:00',
        ],
      });
      */

      // yearly, byDay,byMonthday
      testRRULE('FREQ=YEARLY;BYDAY=+1MO;BYMONTHDAY=7', {
        dtStart: '2015-01-01T08:00:00',
        dates: [
          '2019-01-07T08:00:00'
        ]
      })

      // Tycho brahe days - yearly, byYearDay with negative offsets
      testRRULE('FREQ=YEARLY;BYYEARDAY=1,2,4,6,11,12,20,42,48,49,-306,-303,' +
                '-293,-292,-266,-259,-258,-239,-228,-209,-168,-164,-134,-133,' +
                '-113,-105,-87,-56,-44,-26,-21,-14', {
        dtStart: '2015-01-01',
        dates: [
          '2015-01-01',
          '2015-01-02',
          '2015-01-04',
          '2015-01-06',
          '2015-01-11',
          '2015-01-12',
          '2015-01-20',
          '2015-02-11',
          '2015-02-17',
          '2015-02-18',
          '2015-03-01',
          '2015-03-04',
          '2015-03-14',
          '2015-03-15',
          '2015-04-10',
          '2015-04-17',
          '2015-04-18',
          '2015-05-07',
          '2015-05-18',
          '2015-06-06',
          '2015-07-17',
          '2015-07-21',
          '2015-08-20',
          '2015-08-21',
          '2015-09-10',
          '2015-09-18',
          '2015-10-06',
          '2015-11-06',
          '2015-11-18',
          '2015-12-06',
          '2015-12-11',
          '2015-12-18',
        ],
      })

      // Leap year - yearly, byYearDay with negative offsets
      testRRULE('FREQ=YEARLY;BYYEARDAY=-308,-307,-306', {
        dtStart: '2012-01-01',
        dates: [
          '2012-02-28',
          '2012-02-29',
          '2012-03-01',
        ],
      })

      // Non-leap year - yearly, byYearDay with negative offsets
      testRRULE('FREQ=YEARLY;BYYEARDAY=-307,-306,-305', {
        dtStart: '2013-01-01',
        dates: [
          '2013-02-28',
          '2013-03-01',
          '2013-03-02',
        ],
      })

      /*
       * Leap-year test for February 29th
       *
       * See https://github.com/mozilla-comm/ical.js/issues/91
       * for details
       *
       * TODO: Uncomment when new recurrence iterator is ready
       */

      /*
      testRRULE('FREQ=YEARLY;', {
        dtStart: '2012-02-29T12:00:00',
        dates: [
          '2012-02-29T12:00:00',
          '2016-02-29T12:00:00',
        ],
      });
      */
    })
  })
})
