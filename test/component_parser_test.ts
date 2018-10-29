import { getICAL } from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it } from 'mocha'

const ICAL = getICAL()
const { Component, ComponentParser, Event, Timezone } = ICAL

describe('component_parser', async () => {
  // let subject: ical.ComponentParser
  const icsData = await defineSample('recur_instances.ics')

  describe('#process', () => {
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

    async function setupProcess(options?: Arg<0, typeof ComponentParser>, ical = ICAL.parse(icsData)) {
      const events: ical.Event[] = []
      const timezones: ical.Timezone[] = []
      const subject = ComponentParser(options)

      subject.on('event', (event) => {
        events.push(event)
      })
      subject.on('timezone', (tz) => {
        timezones.push(tz)
      })

      await subject.process(ical)
      return { events, subject, timezones }
    }

    describe('without events', () => {
      it('parse result', async () => {
        const { events, timezones } = await setupProcess({ parseEvent: false })
        expect(events).to.be.empty
        expect(timezones).to.have.lengthOf(1)

        const tz = timezones[0]
        expect(tz).to.be.instanceOf(Timezone)
        expect(tz.tzid).to.equal('America/Los_Angeles')
      })
    })

    describe('with events', () => {
      it('parse result', async () => {
        const { events } = await setupProcess()
        const component = new Component(ICAL.parse(icsData))
        const list = component.getAllSubcomponents('vevent')

        const expectedEvents: ical.Event[] = []

        list.forEach((item) => {
          expectedEvents.push(new Event(item))
        })

        expect(expectedEvents[0]).to.be.instanceOf(Event)

        eventEquals(events[0], expectedEvents[0])
        eventEquals(events[1], expectedEvents[1])
        eventEquals(events[2], expectedEvents[2])
      })
    })

    describe('without parsing timezones', () => {
      it('parse result', async () => {
        const { events, timezones } = await setupProcess({ parseTimezone: false })
        expect(timezones).to.be.empty
        expect(events).to.have.lengthOf(3)
      })
    })

    describe('alternate input', () => {
      it('parsing component from string', async () => {
        const { events } = await setupProcess()
        expect(events).to.have.lengthOf(3)
      })
      it('parsing component from component', async () => {
        const { events } = await setupProcess({}, new ICAL.Component(ICAL.parse(icsData)))
        expect(events).to.have.lengthOf(3)
      })
    })
  })

})
