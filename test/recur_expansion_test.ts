import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it } from 'mocha'

describe('recur_expansion', async () => {
  let subject
  let primary

  async function createSubject(file: string) {
    const icsData = await defineSample(file)
    await new Promise((done) => {
      const exceptions: ical.Event[] = []

      const parse = new ICAL.ComponentParser()

      parse.onevent = function (event) {
        if (event.isRecurrenceException()) {
          exceptions.push(event)
        } else {
          primary = event
        }
      }

      parse.oncomplete = function () {
        exceptions.forEach(primary.relateException, primary)
        subject = new ICAL.RecurExpansion({
          component: primary.component,
          dtstart: primary.startDate
        })

        done()
      }

      parse.process(icsData[file])
    })
  }

  await createSubject('recur_instances.ics')

  describe('initialization', function () {
    it('successful', function () {
      expect(new Date(2012, 9, 2, 10)).to.deep.equal(subject.last.toJSDate())
      expect(subject.ruleIterators).to.be.an('array')
      expect(subject.exDates)
    })

    it('invalid', () => {
      expect(() => { new ICAL.RecurExpansion({}) })
        .to.throw('.dtstart (ICAL.Time) must be given')
      expect(() => { new ICAL.RecurExpansion({ dtstart: ICAL.Time.now() }) })
        .to.throw('.ruleIterators or .component must be given')
    })

    it('default', function () {
      const dtstart = ICAL.Time.fromData({
        year: 2012,
        month: 2,
        day: 2
      })
      const subject = new ICAL.RecurExpansion({
        dtstart: dtstart,
        ruleIterators: []
      })

      expect(subject.ruleDates).to.be.empty
      expect(subject['exDates']).to.be.empty
      expect(subject.complete).to.be.false

      expect(subject.toJSON()).to.be.equal({
        ruleIterators: [],
        ruleDates: [],
        exDates: [],
        ruleDateInc: undefined,
        exDateInc: undefined,
        dtstart: dtstart.toJSON(),
        last: dtstart.toJSON(),
        complete: false
      })
    })
  })

  describe('#_ensureRules', function () {
    it('.ruleDates', function () {
      const expected = [
        new Date(2012, 10, 5, 10),
        new Date(2012, 10, 10, 10),
        new Date(2012, 10, 30, 10)
      ]


      const dates = subject.ruleDates.map(function (time) {
        return time.toJSDate()
      })

      expect(expected).to.equal(dates)
    })

    it('.exDates', function () {
      const expected = [
        new Date(2012, 11, 4, 10),
        new Date(2013, 1, 5, 10),
        new Date(2013, 3, 2, 10)
      ]

      const dates = subject.exDates.map(function (time) {
        return time.toJSDate()
      })

      expect(expected).to.equal(dates)
    })
  })

  describe('#_nextRecurrenceIter', function () {
    // setup a clean component with no rules
    const component = new ICAL.Component(primary.component.toJSON())

    // Simulate a more complicated event by using
    // the original as a base and adding more complex rrule's
    component.removeProperty('rrule')

    it('when rule ends', function () {
      const start = {
        year: 2012,
        month: 1,
        day: 1
      }

      component.removeAllProperties('rdate')
      component.removeAllProperties('exdate')
      component.addPropertyWithValue('rrule', { freq: 'WEEKLY', count: 3, byday: ['SU'] })

      const subject = new ICAL.RecurExpansion({
        component: component,
        dtstart: new ICAL.Time(start)
      })

      const expected = [
        new Date(2012, 0, 1),
        new Date(2012, 0, 8),
        new Date(2012, 0, 15)
      ]

      const max = 10
      let i = 0
      let next
      const dates: Date[] = []

      while (i++ <= max && (next = subject.next())) {
        dates.push(next.toJSDate())
      }

      expect(dates).to.deep.equal(expected)
    })

    it('multiple rules', function () {
      component.addPropertyWithValue('rrule', { freq: 'MONTHLY', bymonthday: [13] })
      component.addPropertyWithValue('rrule', { freq: 'WEEKLY', byday: ['TH'] })

      const start = ICAL.Time.fromData({
        year: 2012,
        month: 2,
        day: 2
      })

      const subject = new ICAL.RecurExpansion({
        component: component,
        dtstart: start
      })

      const expected = [
        new Date(2012, 1, 2),
        new Date(2012, 1, 9),
        new Date(2012, 1, 13),
        new Date(2012, 1, 16),
        new Date(2012, 1, 23)
      ]

      let inc = 0
      const max = expected.length
      const dates: Date[] = []

      while (inc++ < max) {
        const next = subject._nextRecurrenceIter()!
        dates.push(next.last.toJSDate())
        next.next()
      }

      expect(dates).to.deep.equal(expected)
    })

  })

  describe('#next', function () {
    // I use JS dates widely because its much easier
    // to compare them via chai's deepEquals function
    const expected = [
      new Date(2012, 9, 2, 10),
      new Date(2012, 10, 5, 10),
      new Date(2012, 10, 6, 10),
      new Date(2012, 10, 10, 10),
      new Date(2012, 10, 30, 10),
      new Date(2013, 0, 1, 10)
    ]

    it('6 items', function () {
      const dates: Date[] = []
      const max = 6
      let inc = 0
      let next

      while (inc++ < max && (next = subject.next())) {
        dates.push(next.toJSDate())
      }

      expect(dates).to.deep.equal(expected)
    })
  })

  describe('#next - finite', async () => {
    await createSubject('recur_instances_finite.ics')

    it('until complete', function () {
      const max = 100
      let inc = 0
      let next

      const dates: Date[] = []
      const expected = [
        new Date(2012, 9, 2, 10),
        new Date(2012, 10, 5, 10),
        new Date(2012, 10, 6, 10),
        new Date(2012, 10, 10, 10),
        new Date(2012, 11, 4, 10)
      ]

      while (inc++ < max && (next = subject.next())) {
        dates.push(next.toJSDate())
      }

      // round trip
      subject = new ICAL.RecurExpansion(subject.toJSON())

      while (inc++ < max && (next = subject.next())) {
        dates.push(next.toJSDate())
      }

      expect(dates).to.equal(expected)
      expect(subject.complete, 'complete').to.be.true
    })
  })


  describe('#toJSON', function () {
    it('from start', function () {
      const json = subject.toJSON()
      const newIter = new ICAL.RecurExpansion(json)
      let cur = 0

      while (cur++ < 10) {
        expect(subject.next().toJSDate()).to.deep.equal(
          newIter.next().toJSDate(),
          'failed compare at #' + cur
        )
      }
    })

    it('from two iterations', function () {
      subject.next()
      subject.next()

      const json = subject.toJSON()
      const newIter = new ICAL.RecurExpansion(json)
      let cur = 0

      while (cur++ < 10) {
        expect(
          subject.next().toJSDate()).to.deep.equal(
          newIter.next().toJSDate(),
          'failed compare at #' + cur
        )
      }
    })

  })

  describe('event without recurrences', async () => {
    await createSubject('minimal.ics')

    it('iterate', function () {
      const dates: Date[] = []
      let next

      const expected = primary.startDate.toJSDate()

      while ((next = subject.next())) {
        dates.push(next.toJSDate())
      }

      expect(dates[0]).to.equal(expected)
      expect(dates).to.have.lengthOf(1)
      expect(subject.complete).to.be.true

      // json check
      subject = new ICAL.RecurExpansion(
        subject.toJSON()
      )

      expect(subject.complete, 'complete after json').to.be.true
      expect(!subject.next(), 'next value')
    })

  })

})
