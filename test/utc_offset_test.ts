import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it } from 'mocha'

describe('ICAL.UtcOffset', function () {
  it('#clone', function () {
    const subject = new ICAL.UtcOffset({ hours: 5, minutes: 6 })
    expect(subject.toString()).to.equal('+05:06')

    const cloned = subject.clone()
    subject.hours = 6

    expect(cloned.toString()).to.equal('+05:06')
    expect(subject.toString()).to.equal('+06:06')
  })

  it('#toICALString', function () {
    const subject = new ICAL.UtcOffset({ hours: 5, minutes: 6 })
    expect(subject.toString()).to.equal('+05:06')
    expect(subject.toICALString()).to.equal('+0506')
  })

  describe('#normalize', function () {
    it('minute overflow', function () {
      expect(new ICAL.UtcOffset({
        minutes: 120
      })).to.include({
        hours: 2, minutes: 0, factor: 1
      })
    })
    it('minutes underflow', function () {
      expect(new ICAL.UtcOffset({
        minutes: -120
      })).to.include({
        hours: 2, minutes: 0, factor: -1
      })
    })
    it('minutes underflow with hours', function () {
      expect(new ICAL.UtcOffset({
        hours: 2,
        minutes: -120
      })).to.include({
        hours: 0, minutes: 0, factor: 1
      })
    })
    it('hours overflow', function () {
      expect(new ICAL.UtcOffset({
        hours: 15,
        minutes: 30
      })).to.include({
        hours: 11, minutes: 30, factor: -1
      })
    })
    it('hours underflow', function () {
      expect(new ICAL.UtcOffset({
        hours: 13,
        minutes: 30,
        factor: -1
      })).to.include({
        hours: 13, minutes: 30, factor: 1
      })
    })
    it('hours double underflow', function () {
      expect(new ICAL.UtcOffset({
        hours: 40,
        minutes: 30,
        factor: -1
      })).to.include({
        hours: 13, minutes: 30, factor: 1
      })
    })
    it('negative zero utc offset', function () {
      expect(new ICAL.UtcOffset({
        hours: 0,
        minutes: 0,
        factor: -1
      })).to.include({
        hours: 0, minutes: 0, factor: -1
      })
    })
  })

  describe('#compare', function () {
    it('greater', function () {
      const a = new ICAL.UtcOffset({ hours: 5, minutes: 1 })
      const b = new ICAL.UtcOffset({ hours: 5, minutes: 0 })
      expect(a.compare(b)).to.equal(1)
    })
    it('equal', function () {
      const a = new ICAL.UtcOffset({ hours: 15, minutes: 0 })
      const b = new ICAL.UtcOffset({ hours: -12, minutes: 0 })
      expect(a.compare(b)).to.equal(0)
    })
    it('equal zero', function () {
      const a = new ICAL.UtcOffset({ hours: 0, minutes: 0, factor: -1 })
      const b = new ICAL.UtcOffset({ hours: 0, minutes: 0 })
      expect(a.compare(b)).to.equal(0)
    })
    it('less than', function () {
      const a = new ICAL.UtcOffset({ hours: 5, minutes: 0 })
      const b = new ICAL.UtcOffset({ hours: 5, minutes: 1 })
      expect(a.compare(b)).to.equal(-1)
    })
  })

  describe('from/toSeconds', function () {
    it('static', function () {
      const subject = ICAL.UtcOffset.fromSeconds(3661)
      expect(subject.toString()).to.equal('+01:01')
      expect(subject.toSeconds()).to.equal(3660)
    })
    it('instance', function () {
      const subject = ICAL.UtcOffset.fromSeconds(3661)
      subject.fromSeconds(-7321)
      expect(subject.toString()).to.equal('-02:02')
      expect(subject.toSeconds()).to.equal(-7320)
    })
  })
})
