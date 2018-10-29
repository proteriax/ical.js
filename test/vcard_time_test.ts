import { getICAL } from './ical'
import { expect } from 'chai'
import { useTimezones } from './helper'
import { describe, it } from 'mocha'

const ICAL = getICAL()

describe('vcard time', () => {
  // Lots of things are also covered in the design test

  describe('initialization', () => {
    it('default icaltype', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-01')
      expect(subject.icaltype).to.equal('date-and-or-time')
    })

    it('clone', () => {
      const orig = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-02T03:04:05-08:00', 'date-time')
      const subject = orig.clone()

      orig.day++
      orig.month++
      orig.year++
      orig.hour++
      orig.minute++
      orig.second++
      orig.zone = ICAL.Timezone.utcTimezone

      expect(orig.toString()).to.equal('2016-02-03T04:05:06Z')
      expect(subject.toString()).to.equal('2015-01-02T03:04:05-08:00')
      expect(subject.icaltype).to.equal('date-time')
      expect(subject.zone.toString()).to.equal('-08:00')
    })
  })

  describe('#utcOffset', () => {
    useTimezones(ICAL, 'America/New_York')

    it('floating and utc', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-02T03:04:05', 'date-time')
      subject.zone = ICAL.Timezone.utcTimezone
      expect(subject.utcOffset()).to.equal(0)

      subject.zone = ICAL.Timezone.localTimezone
      expect(subject.utcOffset()).to.equal(0)
    })
    it('ICAL.UtcOffset', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-02T03:04:05-08:00', 'date-time')
      expect(subject.utcOffset()).to.equal(-28800)
    })
    it('Olson timezone', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-02T03:04:05')
      subject.zone = ICAL.TimezoneService.get('America/New_York')!
      expect(subject.utcOffset()).to.equal(-18000)
    })
  })

  describe('#toString', () => {
    useTimezones(ICAL, 'America/New_York')

    it('invalid icaltype', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-01', 'ballparkfigure')
      expect(subject.toString()).to.be.empty
    })
    it('invalid timezone', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-01T01:01:01')
      subject.zone = undefined as any
      expect(subject.toString()).to.equal('2015-01-01T01:01:01')
    })
    it('Olson timezone', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-02T03:04:05')
      subject.zone = ICAL.TimezoneService.get('America/New_York')!
      expect(subject.toString()).to.equal('2015-01-02T03:04:05-05:00')
    })
  })
})
