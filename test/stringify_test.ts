import * as ICAL from './ical'
import { expect } from 'chai'
import { load } from './helper'
import { describe, it } from 'mocha'

describe('ICAL.stringify', () => {

  describe('round trip tests', () => {
    const root = 'samples/'
    const list = [
      'minimal',
      'blank_line_end',
      'forced_types',
      'parserv2',
      'utc_negative_zero'
    ]

    for (const path of list) {
      describe(path.replace('_', ' '), async () => {
        const input = await load(root + path + '.ics')
        function jsonEqual(actual, expected) {
          expect(actual).to.deep.equal(expected,
            'hint use: ' +
            'http://tlrobinson.net/projects/javascript-fun/jsondiff/\n\n' +
            '\nexpected:\n\n' +
              JSON.stringify(actual, null, 2) +
            '\n\n to equal:\n\n ' +
              JSON.stringify(expected, null, 2) + '\n\n'
          )
        }

        it('round-trip', () => {
          const parsed = ICAL.parse(input)
          const ical = ICAL.stringify(parsed)

          // NOTE: this is not an absolute test that serialization
          //       works as our parser should be error tolerant and
          //       its remotely possible that we consistently produce
          //       ICAL that only we can parse.
          jsonEqual(
            ICAL.parse(ical),
            parsed
          )
        })

      })
    }
  })

  describe('stringify property', () => {
    it('no explicit default set', () => {
      const subject = new ICAL.Property('tz', new ICAL.Component('vcard'))
      subject.setValue(ICAL.UtcOffset.fromString('+0500'))

      const ical = ICAL.stringify.property(subject.toJSON())
      expect(ical).to.equal('TZ;VALUE=UTC-OFFSET:+0500')
    })

    it('custom property with no default type', () => {
      ICAL.design.defaultSet.property['custom'] = {}
      const subject = new ICAL.Property('custom')
      subject.setValue('unescaped, right?')
      expect(subject.toICALString()).to.equal('CUSTOM:unescaped, right?')

      subject.resetType('integer')
      subject.setValue(123)
      expect(subject.toICALString()).to.equal('CUSTOM;VALUE=INTEGER:123')

      delete ICAL.design.defaultSet.property['custom']
    })

    it('custom property not using default type', () => {
      ICAL.design.defaultSet.property['custom'] = { defaultType: 'text' }
      const subject = new ICAL.Property('custom')
      subject.resetType('integer')
      subject.setValue(123)
      expect(subject.toICALString()).to.equal('CUSTOM;VALUE=INTEGER:123')
      delete ICAL.design.defaultSet.property['custom']
    })

    it('rfc6868 roundtrip', () => {
      const subject = new ICAL.Property('attendee')
      const input = 'caret ^ dquote " newline \n end'
      const expected = 'ATTENDEE;CN=caret ^^ dquote ^\' newline ^n end:mailto:id'
      subject.setParameter('cn', input)
      subject.setValue('mailto:id')
      expect(subject.toICALString()).to.equal(expected)
      expect(ICAL.parse.property(expected)[1].cn).to.equal(input)
    })

    it('folding', () => {
      const oldLength = ICAL.foldLength
      const subject = new ICAL.Property('description')
      const N = ICAL.newLineChar + ' '
      subject.setValue('foobar')

      ICAL[`foldLength` + ''] = 19
      expect(subject.toICALString()).to.equal('DESCRIPTION:foobar')
      expect(ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, false)).to.equal('DESCRIPTION:foobar')
      expect(ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, true)).to.equal( 'DESCRIPTION:foobar')

      ICAL[`foldLength` + ''] = 15
      expect(subject.toICALString()).to.equal('DESCRIPTION:foobar')
      expect(ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, false)).to.equal('DESCRIPTION:foo' + N + 'bar')
      expect(ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, true)).to.equal('DESCRIPTION:foobar')

      ICAL[`foldLength` + ''] = oldLength
    })
  })

  describe('stringify component', () => {
    it('minimal jcal', () => {
      const subject = ['vcalendar', [['version', {}, 'text', '2.0']], [['vevent', [], []]]]
      const expected = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR'

      expect(ICAL.stringify.component(subject)).to.equal(expected)
    })

    it('minimal jcard', () => {
      // related to issue #266
      const subject = ['vcard', [['version', {}, 'text', '4.0']]]
      const expected = 'BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD'

      expect(ICAL.stringify.component(subject)).to.equal(expected)
    })

    it('minimal jcard with empty subcomponent', () => {
      const subject = ['vcard', [['version', {}, 'text', '4.0']], []]
      const expected = 'BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD'

      expect(ICAL.stringify.component(subject)).to.equal(expected)
    })
  })
})
