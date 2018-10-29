import { getICAL } from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it, beforeEach } from 'mocha'

const ICAL = getICAL()

describe('timezone_service', async () => {
  const icsData = await defineSample('timezones/America/Los_Angeles.ics')

  const subject = ICAL.TimezoneService

  beforeEach(() => {
    subject.reset()
  })

  it('utc zones', () => {
    const zones = ['Z', 'UTC', 'GMT']
    zones.forEach(tzid => {
      expect(subject.has(tzid), `${tzid} should exist`)
      expect(subject.get(tzid)).to.equal(ICAL.Timezone.utcTimezone)
    })
  })

  it('#reset', () => {
    const name = 'ZFOO'
    subject.register(name, ICAL.Timezone.utcTimezone)
    expect(subject.has(name), `should have set ${name}`).to.be.true

    subject.reset()
    expect(subject.has(name), `removes ${name} after reset`).to.be.false
  })

  describe('register zones', () => {
    it('when it does not exist', () => {
      const name = 'test'
      expect(subject.has(name)).to.be.false

      subject.register(name, ICAL.Timezone.localTimezone)
      expect(subject.has(name), 'is present after set').to.be.true
      expect(subject.get(name)).to.equal(ICAL.Timezone.localTimezone)

      subject.remove(name)
      expect(subject.has(name), 'can remove zones').to.be.false
    })

    it('with invalid type', () => {
      expect(() => {
        subject.register('zzz', 'fff' as any)
      }).to.throw('timezone must be Timezone')
    })
    it('with only invalid component', () => {
      expect(() => {
        const comp = new ICAL.Component('vtoaster')
        subject.register(comp)
      }).to.throw('timezone must be Timezone')
    })

    it('override', () => {
      // don't do this but you can if you want to shoot
      // yourself in the foot.
      subject.register('Z', ICAL.Timezone.localTimezone)

      expect(subject.get('Z')).to.equal(ICAL.Timezone.localTimezone)
    })

    it('using a component', () => {
      const parsed = ICAL.parse(icsData)
      const comp = new ICAL.Component(parsed)
      const vtimezone = comp.getFirstSubcomponent('vtimezone')!
      const tzid = vtimezone.getFirstPropertyValue('tzid')

      subject.register(vtimezone)

      expect(subject.has(tzid), 'successfully registed with component').to.be.true

      const zone = subject.get(tzid)!

      expect(zone).to.be.instanceOf(ICAL.Timezone)
      expect(zone.tzid).to.equal(tzid)
    })

  })

})
