import { getICAL } from './ical'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { load } from './helper'

const ICAL = getICAL()

describe('parserv2', () => {
  const subject = ICAL.parse

  /**
   * Full parser tests fetch two resources
   * (one to parse, one is expected
   */
  describe('full parser tests', () => {
    const root = 'test/parser/'
    const list = [
      // icalendar tests
      'rfc.ics',
      'single_empty_vcalendar.ics',
      'property_params.ics',
      'newline_junk.ics',
      'unfold_properties.ics',
      'quoted_params.ics',
      'multivalue.ics',
      'values.ics',
      'recur.ics',
      'base64.ics',
      'dates.ics',
      'time.ics',
      'boolean.ics',
      'float.ics',
      'integer.ics',
      'period.ics',
      'utc_offset.ics',
      'component.ics',
      'tzid_with_gmt.ics',
      'multiple_root_components.ics',

      // vcard tests
      'vcard.vcf',
      'vcard_author.vcf',
      'vcard3.vcf'
    ]

    list.forEach((path) => {
      describe(path.replace('_', ' '), async () => {
        const input = await load(root + path)
        const expected = JSON.parse(await load(root + path.replace(/vcf|ics$/, 'json')))

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
          const parsed = subject(input)
          const ical = ICAL.stringify(parsed)

          // NOTE: this is not an absolute test that serialization
          //       works as our parser should be error tolerant and
          //       its remotely possible that we consistently produce
          //       ICAL that only we can parse.
          jsonEqual(
            subject(ical),
            expected
          )
        })

        it('compare', () => {
          const actual = subject(input)
          jsonEqual(actual, expected)
        })
      })
    })
  })

  describe('invalid ical', () => {

    it('invalid property', () => {
      let ical = 'BEGIN:VCALENDAR\n'
      // no param or value token
      ical += 'DTSTART\n'
      ical += 'DESCRIPTION:1\n'
      ical += 'END:VCALENDAR'

      expect(() => subject(ical)).to.throw(/invalid line/)
    })

    it('invalid quoted params', () => {
      let ical = 'BEGIN:VCALENDAR\n'
      ical += 'X-FOO;BAR="quoted\n'
      // an invalid newline inside quoted parameter
      ical += 'params";FOO=baz:realvalue\n'
      ical += 'END:VCALENDAR'

      expect(() => subject(ical)).to.throw(/invalid line/)
    })

    it('missing value with param delimiter', () => {
      const ical = 'BEGIN:VCALENDAR\nX-FOO;\n'
      expect(() => subject(ical)).to.throw('Invalid parameters in')
    })

    it('missing param name ', () => {
      const ical = 'BEGIN:VCALENDAR\n' +
                 'X-FOO;=\n'
                 expect(() => subject(ical)).to.throw('Empty parameter name in')
    })

    it('missing param value', () => {
      const ical = 'BEGIN:VCALENDAR\n' +
                 'X-FOO;BAR=\n'
                 expect(() => subject(ical)).to.throw('Missing parameter value in')
    })

    it('missing component end', () => {
      let ical = 'BEGIN:VCALENDAR\n'
      ical += 'BEGIN:VEVENT\n'
      ical += 'BEGIN:VALARM\n'
      ical += 'DESCRIPTION: foo\n'
      ical += 'END:VALARM'
      // ended calendar before event
      ical += 'END:VCALENDAR'

      expect(() => subject(ical)).to.throw(/invalid/)
    })

  })

  describe('#_parseParameters', () => {
    it('with processed text', () => {
      const input = ';FOO=x\\na'
      const expected = {
        'foo': 'x\na'
      }

      expect(
        subject._parseParameters(input, 0, ICAL.design.defaultSet)[0]
      ).to.deep.equal(
        expected
      )
    })
  })

  it('#_parseMultiValue', () => {
    const values = 'woot\\, category,foo,bar,baz'
    const result = []
    expect(
      subject._parseMultiValue(values, ',', 'text', result, null, ICAL.design.defaultSet)
    ).to.deep.equal(
      ['woot, category', 'foo', 'bar', 'baz']
    )
  })

  describe('#_parseValue', () => {
    it('text', () => {
      const value = 'start \\n next'
      const expected = 'start \n next'

      expect(
        subject._parseValue(value, 'text', ICAL.design.defaultSet)
      ).to.equal(
        expected
      )
    })
  })

  describe('#_eachLine', () => {
    function unfold(input: string) {
      const result: string[] = []
      subject._eachLine(input, (_e, line) => {
        result.push(line)
      })
      return result
    }

    it('unfold single with \\r\\n', () => {
      const input = 'foo\r\n bar'
      const expected = ['foobar']

      expect(unfold(input)).to.deep.equal(expected)
    })

    it('with \\n', () => {
      const input = 'foo\nbar\n  baz'
      const expected = [
        'foo',
        'bar baz'
      ]
      expect(unfold(input)).to.deep.equal(expected)
    })
  })
})
