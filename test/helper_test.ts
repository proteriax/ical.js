import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it } from 'mocha'

describe('ICAL.helpers', () => {

  describe('#pad2', () => {
    const subject = ICAL.helpers.pad2

    it('with string', function () {
      expect(subject('')).to.equal('00')
      expect(subject('1')).to.equal('01')
      expect(subject('12')).to.equal('12')
      expect(subject('123')).to.equal('123')
    })

    it('with number', function () {
      expect(subject(0)).to.equal('00')
      expect(subject(1)).to.equal('01')
      expect(subject(12)).to.equal('12')
      expect(subject(123)).to.equal('123')
    })
  })

  describe('#foldline', function () {
    const subject = ICAL.helpers.foldline

    it('empty values', function () {
      expect(subject('')).to.equal('')
    })

    // Most other cases are covered by other tests
  })

  describe('#updateTimezones', async function () {
    const subject = ICAL.helpers.updateTimezones
    const cal = new ICAL.Component(ICAL.parse(await defineSample('minimal.ics')))

    const Atikokan = await defineSample('timezones/America/Atikokan.ics')
    ICAL.TimezoneService.register(
      new ICAL.Component(ICAL.parse(Atikokan))
        .getFirstSubcomponent('vtimezone')!
    )

    it('timezones already correct', function () {
      const vtimezones = cal.getAllSubcomponents('vtimezone')
      expect(vtimezones).to.have.lengthOf(1)
      expect(
        vtimezones[0].getFirstProperty('tzid')!.getFirstValue()
      ).to.equal(
        'America/Los_Angeles'
      )
    })

    it('remove extra timezones', function () {
      cal.addSubcomponent(ICAL.TimezoneService.get('America/Atikokan')!.component)
      let vtimezones = cal.getAllSubcomponents('vtimezone')
      expect(vtimezones).to.have.lengthOf(2)

      vtimezones = subject(cal).getAllSubcomponents('vtimezone')
      expect(vtimezones).to.have.lengthOf(1)
      expect(
        vtimezones[0].getFirstProperty('tzid')!.getFirstValue()
      ).to.equal(
        'America/Los_Angeles'
      )
    })

    it('add missing timezones', function () {
      cal.getFirstSubcomponent('vevent')!.
        getFirstProperty('dtend')!.setParameter('tzid', 'America/Atikokan')
      let vtimezones = cal.getAllSubcomponents('vtimezone')!
      expect(vtimezones.length).to.have.lengthOf(1)

      vtimezones = subject(cal).getAllSubcomponents('vtimezone')
      expect(vtimezones).to.have.lengthOf(2)
    })

    it('return non-vcalendar components unchanged', function () {
      const vevent = cal.getFirstSubcomponent('vevent')!
      expect(subject(vevent)).to.deep.equal(vevent)
    })
  })
})
