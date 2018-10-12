import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it, setup } from 'mocha'

describe('component_parser', async function () {
  let subject: ical.ComponentParser
  const icsData = await defineSample('recur_instances.ics')

  it('#process', function () {
    const events: ical.Event[] = []
    const timezones: ical.Timezone[] = []

    function eventEquals<T extends { toJSON(): any }>(a: T, b: T) {
      if (!a) throw new Error('actual is falsy')
      if (!b) throw new Error('expected is falsy')

      if (a instanceof ICAL.Event) {
        a = a.component as any as T
      }
      if (b instanceof ICAL.Event) {
        b = b.component as any as T
      }
      expect(a.toJSON()).to.deep.equal(b.toJSON())
    }

    async function setupProcess(options?) {
      events.length = 0
      timezones.length = 0

      subject = new ICAL.ComponentParser(options)

      subject.onevent = function (event) {
        events.push(event)
      }

      subject.ontimezone = function (tz) {
        timezones.push(tz)
      }

      const complete = new Promise(done => subject.oncomplete = done)
      subject.process(ICAL.parse(icsData))
      await complete
    }

    it('without events', async () => {
      await setupProcess({ parseEvent: false })

      it('parse result', function () {
        expect(events).to.be.empty
        expect(timezones).to.be.empty

        const tz = timezones[0]
        expect(tz).to.be.instanceOf(ICAL.Timezone)
        expect(tz.tzid).to.equal('America/Los_Angeles')
      })

    })

    describe('with events', function () {
      setupProcess()

      it('parse result', function () {
        const component = new ICAL.Component(ICAL.parse(icsData))
        const list = component.getAllSubcomponents('vevent')

        const expectedEvents: ical.Event[] = []

        list.forEach(function (item) {
          expectedEvents.push(new ICAL.Event(item))
        })

        expect(expectedEvents[0]).to.be.instanceOf(ICAL.Event)

        eventEquals(events[0], expectedEvents[0])
        eventEquals(events[1], expectedEvents[1])
        eventEquals(events[2], expectedEvents[2])
      })
    })

    describe('without parsing timezones', function () {
      setupProcess({ parseTimezone: false })

      it('parse result', function () {
        expect(timezones).to.be.empty
        expect(events).to.have.lengthOf(3)
      })
    })

    describe('alternate input', function () {
      it('parsing component from string', function (done) {
        const subject = new ICAL.ComponentParser()
        subject.oncomplete = function () {
          expect(events).to.have.lengthOf(3)
          done()
        }
        subject.process(icsData)
      })
      it('parsing component from component', function (done) {
        const subject = new ICAL.ComponentParser()
        subject.oncomplete = function () {
          expect(events).to.have.lengthOf(3)
          done()
        }
        const comp = new ICAL.Component(ICAL.parse(icsData))
        subject.process(comp)
      })
    })
  })

})
