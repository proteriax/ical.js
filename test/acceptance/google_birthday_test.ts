import * as ICAL from '../ical'
import { expect } from 'chai'
import { defineSample } from '../helper'
import { describe, it } from 'mocha'

describe('google birthday events', async () => {
  const icsData = await defineSample('google_birthday.ics')

  it('expands malformatted recurring event', (done) => {
    // just verify it can parse forced types
    const parser = new ICAL.ComponentParser()
    let primary: ical.Event
    const exceptions: ical.Event[] = []

    const expectedDates = [
      new Date(2012, 11, 10),
      new Date(2013, 11, 10),
      new Date(2014, 11, 10)
    ]

    parser.onevent = function (event) {
      if (event.isRecurrenceException()) {
        exceptions.push(event)
      } else {
        primary = event
      }
    }

    parser.oncomplete = function () {
      exceptions.forEach(function (item) {
        primary.relateException(item)
      })

      const iter = primary.iterator()
      let next
      const dates: Date[] = []
      while ((next = iter.next())) {
        dates.push(next.toJSDate())
      }
      expect(dates).to.deep.equal(expectedDates)
      done()
    }

    parser.process(icsData)
  })
})
