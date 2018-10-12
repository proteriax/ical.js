import * as ICAL from './ical'
import { expect } from 'chai'
import { defineSample } from './helper'
import { describe, it, suiteTeardown } from 'mocha'

describe('design', async () => {
  const parsed = ICAL.parse(await defineSample('timezones/America/New_York.ics'))
  const vcalendar = new ICAL.Component(parsed)
  const vtimezone = vcalendar.getFirstSubcomponent('vtimezone')!

  const timezone = new ICAL.Timezone(vtimezone)
  ICAL.TimezoneService.register('test', timezone)

  suiteTeardown(() => {
    ICAL.TimezoneService.reset()
  })

  const subject = ICAL.design.defaultSet

  describe('types', () => {

    describe('binary', () => {
      const binary = subject.value.binary

      it('#(un)decorate', () => {
        const expectedDecode = 'The quick brown fox jumps over the lazy dog.'
        const undecorated = 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZy4='
        const decorated = binary.decorate(undecorated)
        const decoded = decorated.decodeValue()

        expect(decoded).to.equal(expectedDecode)
        expect(binary.undecorate(decorated)).to.equal(undecorated)
      })
    })

    describe('date', () => {
      const date = subject.value.date

      it('#fromICAL', () => {
        const value = date.fromICAL('20121010')
        expect(value).to.equal('2012-10-10')
      })

      it('#toICAL', () => {
        const value = date.toICAL('2012-10-10')
        expect(value).to.equal('20121010')
      })
      it('#toICAL invalid', () => {
        const value = date.toICAL('wheeeeeeeeeeeeee')
        expect(value).to.equal('wheeeeeeeeeeeeee')
      })

      it('#(un)decorate (custom timezone)', () => {
        const value = '2012-10-10'
        const time = date.decorate(value)

        expect(time).to.include({ year: 2012, month: 10, day: 10, isDate: true })
        expect(date.undecorate(time)).to.equal(value)
      })
    })

    describe('date-time', () => {
      const dateTime = subject.value['date-time']

      it('#(from|to)ICAL', () => {
        const value = '20120901T130000'
        const expected = '2012-09-01T13:00:00'
        dateTime.fromICAL(value)
        expect(dateTime.fromICAL(value)).to.equal(expected)
        expect(dateTime.toICAL(expected)).to.equal(value)
      })

      it('#toICAL invalid', () => {
        const value = dateTime.toICAL('wheeeeeeeeeeeeee')
        expect(value).to.equal('wheeeeeeeeeeeeee')
      })

      it('#(un)decorate (utc)', () => {
        const undecorated = '2012-09-01T13:05:11Z'
        const prop = new ICAL.Property(['date-time', {}])

        const decorated = dateTime.decorate(undecorated, prop)

        expect(decorated).to.include({
          year: 2012,
          month: 9,
          day: 1,
          hour: 13,
          minute: 5,
          second: 11,
          isDate: false,
          zone: ICAL.Timezone.utcTimezone,
        })

        expect(dateTime.undecorate(decorated)).to.equal(undecorated)
      })

      it('#(un)decorate (custom timezone)', () => {
        const prop = new ICAL.Property(
          ['date-time', { tzid: 'test' }]
        )
        expect(prop.getParameter('tzid')).to.equal('test')

        ICAL.TimezoneService.register(
          'America/Los_Angeles',
          ICAL.Timezone.utcTimezone
        )

        const undecorated = '2012-09-01T13:05:11'
        const decorated = dateTime.decorate(undecorated, prop)
        expect(decorated.zone).to.equal(timezone)

        expect(
          decorated).to.include(
          {
            year: 2012,
            month: 9,
            day: 1,
            hour: 13,
            minute: 5,
            second: 11,
            isDate: false
          }
        )

        expect(
          dateTime.undecorate(decorated)).to.equal(
          undecorated
        )
      })
    })

    describe('time', () => {
      const time = subject.value.time
      it('#fromICAL', () => {
        const value = time.fromICAL(
          '232050'
        )

        expect(value).to.equal('23:20:50')
      })
      it('#fromICAL invalid', () => {
        const value = time.fromICAL(
          'whoop'
        )

        expect(value).to.equal('whoop')
      })

      it('#toICAL', () => {
        const value = time.toICAL(
          '23:20:50'
        )

        expect(value).to.equal('232050')
      })
      it('#toICAL invalid', () => {
        const value = time.toICAL(
          'whoop'
        )

        expect(value).to.equal('whoop')
      })
    })

    describe('vcard date/time types', () => {
      function testRoundtrip(jcal, ical, props, only?: boolean) {
        function testForType(type: string, valuePrefix?, valueSuffix?, zone?) {
          const subject = ICAL.design.vcard.value[type]
          const prefix = valuePrefix || ''
          const suffix = valueSuffix || ''
          const jcalvalue = prefix + jcal + suffix
          const icalvalue = prefix + ical + suffix.replace(':', '')
          const zoneName = zone || valueSuffix || 'floating'

          it(type + ' ' + zoneName + ' fromICAL/toICAL', () => {
            expect(subject.fromICAL(icalvalue)).to.equal(jcalvalue)
            expect(subject.toICAL(jcalvalue)).to.equal(icalvalue)
          })

          it(type + ' ' + zoneName + ' decorated/undecorated', () => {
            const prop = new ICAL.Property(['anniversary', {}, type])
            const decorated = subject.decorate(jcalvalue, prop)
            const undecorated = subject.undecorate(decorated)

            expect(decorated._time).to.include(props)
            expect(zoneName).to.equal(decorated.zone.toString())
            expect(undecorated).to.equal(jcalvalue)
            expect(decorated.toICALString()).to.equal(icalvalue)
          })
        }
        (only ? describe.only : describe)(jcal, () => {

          if (props.year || props.month || props.day) {
            testForType('date-and-or-time')
            if (!props.hour && !props.minute && !props.second) {
              testForType('date')
            } else {
              testForType('date-time')
            }
          } else if (props.hour || props.minute || props.second) {
            if (!props.year && !props.month && !props.day) {
              testForType('date-and-or-time', 'T')
              testForType('date-and-or-time', 'T', 'Z', 'UTC')
              testForType('date-and-or-time', 'T', '-08:00')
              testForType('date-and-or-time', 'T', '+08:00')
              testForType('time')
              testForType('time', null, 'Z', 'UTC')
              testForType('time', null, '-08:00')
              testForType('time', null, '+08:00')
            } else {
              testForType('date-and-or-time', null)
              testForType('date-and-or-time', null, 'Z', 'UTC')
              testForType('date-and-or-time', null, '-08:00')
              testForType('date-and-or-time', null, '+08:00')
            }
          }
        })
      }
      testRoundtrip.only = function (jcal, ical, props) {
        testRoundtrip(jcal, ical, props, true)
      }

      // dates
      testRoundtrip('1985-04-12', '19850412', {
        year: 1985, month: 4, day: 12,
        hour: null, minute: null, second: null
      })
      testRoundtrip('1985-04', '1985-04', {
        year: 1985, month: 4, day: null,
        hour: null, minute: null, second: null
      })
      testRoundtrip('1985', '1985', {
        year: 1985, month: null, day: null,
        hour: null, minute: null, second: null
      })
      testRoundtrip('--04-12', '--0412', {
        year: null, month: 4, day: 12,
        hour: null, minute: null, second: null
      })
      testRoundtrip('--04', '--04', {
        year: null, month: 4, day: null,
        hour: null, minute: null, second: null
      })
      testRoundtrip('---12', '---12', {
        year: null, month: null, day: 12,
        hour: null, minute: null, second: null
      })

      // times
      testRoundtrip('23:20:50', '232050', {
        year: null, month: null, day: null,
        hour: 23, minute: 20, second: 50,
      })
      testRoundtrip('23:20', '2320', {
        year: null, month: null, day: null,
        hour: 23, minute: 20, second: null,
      })
      testRoundtrip('23', '23', {
        year: null, month: null, day: null,
        hour: 23, minute: null, second: null,
      })
      testRoundtrip('-20:50', '-2050', {
        year: null, month: null, day: null,
        hour: null, minute: 20, second: 50,
      })
      testRoundtrip('-20', '-20', {
        year: null, month: null, day: null,
        hour: null, minute: 20, second: null,
      })
      testRoundtrip('--50', '--50', {
        year: null, month: null, day: null,
        hour: null, minute: null, second: 50,
      })

      // date-times
      testRoundtrip('1985-04-12T23:20:50', '19850412T232050', {
        year: 1985, month: 4, day: 12,
        hour: 23, minute: 20, second: 50
      })
      testRoundtrip('1985-04-12T23:20', '19850412T2320', {
        year: 1985, month: 4, day: 12,
        hour: 23, minute: 20, second: null
      })
      testRoundtrip('1985-04-12T23', '19850412T23', {
        year: 1985, month: 4, day: 12,
        hour: 23, minute: null, second: null
      })
      testRoundtrip('--04-12T23:20', '--0412T2320', {
        year: null, month: 4, day: 12,
        hour: 23, minute: 20, second: null
      })
      testRoundtrip('--04T23:20', '--04T2320', {
        year: null, month: 4, day: null,
        hour: 23, minute: 20, second: null
      })
      testRoundtrip('---12T23:20', '---12T2320', {
        year: null, month: null, day: 12,
        hour: 23, minute: 20, second: null
      })
      testRoundtrip('--04T23', '--04T23', {
        year: null, month: 4, day: null,
        hour: 23, minute: null, second: null
      })
    })

    describe('duration', () => {
      const duration = subject.value.duration

      it('#(un)decorate', () => {
        const undecorated = 'P15DT5H5M20S'
        const decorated = duration.decorate(undecorated)
        expect(duration.undecorate(decorated)).to.equal(undecorated)
      })
    })

    describe('float', () => {
      const float = subject.value.float

      it('#(from|to)ICAL', () => {
        const original = '1.5'
        const fromICAL = float.fromICAL(original)

        expect(fromICAL).to.equal(1.5)
        expect(float.toICAL(fromICAL)).to.equal(original)
      })
    })

    describe('integer', () => {
      const integer = subject.value.integer
      it('#(from|to)ICAL', () => {
        const original = '105'
        const fromICAL = integer.fromICAL(original)

        expect(fromICAL).to.equal(105)
        expect(integer.toICAL(fromICAL)).to.equal(original)
      })
    })

    describe('period', () => {
      const period = subject.value.period

      it('#(to|from)ICAL date/date', () => {
        const original = '19970101T180000Z/19970102T070000Z'
        const fromICAL = period.fromICAL(original)
        expect(fromICAL).to.deep.equal(['1997-01-01T18:00:00Z', '1997-01-02T07:00:00Z'])
        expect(period.toICAL(fromICAL)).to.equal(original)
      })

      it('#(un)decorate (date-time/duration)', () => {
        const prop = new ICAL.Property(['date', { tzid: 'test' }])

        const undecorated: [string, string] = ['1997-01-01T18:00:00', 'PT5H30M']
        const decorated = period.decorate(undecorated, prop)

        expect(decorated.start).to.include({
          year: 1997,
          day: 1,
          month: 1,
          hour: 18,
        })

        expect(decorated.start.zone).to.equal(timezone)
        expect(decorated.duration).to.include({ hours: 5, minutes: 30 })

        expect(period.undecorate(decorated)).to.deep.equal(undecorated)
      })

      it('#(un)decorate (date-time/date-time)', () => {
        const prop = new ICAL.Property(['date', { tzid: 'test' }])

        const undecorated: [string, string] = ['1997-01-01T18:00:00', '1998-01-01T17:00:00']
        const decorated = period.decorate(undecorated, prop)

        expect(decorated.start).to.include({
          year: 1997,
          day: 1,
          month: 1,
          hour: 18
        })

        expect(decorated.end).to.include({
          year: 1998,
          day: 1,
          month: 1,
          hour: 17
        })

        expect(decorated.start.zone).to.equal(timezone)
        expect(decorated.end.zone).to.equal(timezone)

        expect(period.undecorate(decorated)).to.deep.equal(undecorated)
      })

      it('#(un)decorate (date-time/duration)', () => {
        const prop = new ICAL.Property(['date', { tzid: 'test' }])

        const undecorated: [string, string] = ['1997-01-01T18:00:00', 'PT5H30M']
        const decorated = period.decorate(undecorated, prop)

        expect(
          decorated.start).to.include(
          {
            year: 1997,
            day: 1,
            month: 1,
            hour: 18
          }
        )

        expect(decorated.start.zone).to.equal(timezone)

        expect(decorated.duration).to.include({
          hours: 5,
          minutes: 30
        })

        expect(period.undecorate(decorated)).to.deep.equal(undecorated)
      })
    })

    describe('recur', () => {
      const recur = subject.value.recur

      it('#(to|from)ICAL', () => {
        const original = 'FREQ=MONTHLY;UNTIL=20121112T131415;COUNT=1'
        const fromICAL = recur.fromICAL(original)

        expect(fromICAL).to.deep.equal({
          freq: 'MONTHLY',
          until: '2012-11-12T13:14:15',
          count: 1,
        })

        expect(
          recur.toICAL(fromICAL)).to.equal(
          original
        )
      })

      it('#(un)decorate', () => {
        const undecorated = {
          freq: ICAL.FrequencyValues.MONTHLY,
          byday: ['MO', 'TU', 'WE', 'TH', 'FR'],
          until: ICAL.Time.fromDateString('2012-10-12'),
        }
        const decorated = recur.decorate(undecorated)

        expect(decorated).to.be.instanceOf(ICAL.Recur)

        expect(decorated).to.include({
          freq: 'MONTHLY',
          parts: {
            BYDAY: ['MO', 'TU', 'WE', 'TH', 'FR']
          }
        })

        expect(decorated.until).to.include({
          year: 2012,
          month: 10,
          day: 12
        })

        expect(recur.undecorate(decorated)).to.deep.equal(undecorated)
      })
    })

    describe('utc-offset', () => {
      const utcOffset = subject.value['utf-offset']

      it('#(to|from)ICAL without seconds', () => {
        const original = '-0500'
        const fromICAL = utcOffset.fromICAL(original)

        expect(fromICAL).to.equal('-05:00')
        expect(utcOffset.toICAL(fromICAL)).to.equal(original)
      })

      it('#(to|from)ICAL with seconds', () => {
        const original = '+054515'
        const fromICAL = utcOffset.fromICAL(original)

        expect(fromICAL).to.equal('+05:45:15')
        expect(
          utcOffset.toICAL(fromICAL)).to.equal(
          original
        )
      })

      it('#(un)decorate', () => {
        const undecorated = '-05:00'
        const decorated = utcOffset.decorate(undecorated)

        expect(decorated.hours).to.equal(5, 'hours')
        expect(decorated.factor).to.equal(-1, 'factor')

        expect(
          utcOffset.undecorate(decorated)).to.equal(
          undecorated
        )
      })
    })

    describe('utc-offset (vcard3)', () => {
      const utcOffset = ICAL.design.vcard3.value['utc-offset']

      it('#(to|from)ICAL', () => {
        const original = '-05:00'
        const fromICAL = utcOffset.fromICAL(original)

        expect(fromICAL).to.equal('-05:00')
        expect(utcOffset.toICAL(fromICAL)).to.equal(original)
      })

      it('#(un)decorate', () => {
        const undecorated = '-05:00'
        const decorated = utcOffset.decorate(undecorated)

        expect(decorated.hours).to.equal(5, 'hours')
        expect(decorated.factor).to.equal(-1, 'factor')

        expect(utcOffset.undecorate(decorated)).to.equal(undecorated)
      })
    })

    describe('unknown and default values', () => {
      it('unknown x-prop', () => {
        let prop = new ICAL.Property('x-wr-calname')
        expect(prop.type).to.equal('unknown')

        prop = ICAL.Property.fromString('X-WR-CALNAME:value')
        expect(prop.type).to.equal('unknown')
      })

      it('unknown iana prop', () => {
        let prop = new ICAL.Property('standardized')
        expect(prop.type).to.equal('unknown')

        prop = ICAL.Property.fromString('STANDARDIZED:value')
        expect(prop.type).to.equal('unknown')
      })

      it('known text type', () => {
        let prop = new ICAL.Property('description')
        expect(prop.type).to.equal('text')

        prop = ICAL.Property.fromString('DESCRIPTION:value')
        expect(prop.type).to.equal('text')
      })

      it('encoded text value roundtrip', () => {
        let prop = new ICAL.Property('description')
        prop.setValue('hello, world')
        const propVal = prop.toICALString()
        expect(propVal).to.equal('DESCRIPTION:hello\\, world')

        prop = ICAL.Property.fromString(propVal)
        expect(prop.getFirstValue()).to.equal('hello, world')
      })

      it('encoded unknown value roundtrip', () => {
        let prop = new ICAL.Property('x-wr-calname')
        prop.setValue('hello, world')
        const propVal = prop.toICALString()
        expect(propVal).to.equal('X-WR-CALNAME:hello, world')

        prop = ICAL.Property.fromString(propVal)
        expect(prop.getFirstValue()).to.equal('hello, world')
      })

      it('encoded unknown value from string', () => {
        const prop = ICAL.Property.fromString('X-WR-CALNAME:hello\\, world')
        expect(prop.getFirstValue()).to.equal('hello\\, world')
      })

      describe('registration', () => {
        it('newly registered property', () => {
          let prop = new ICAL.Property('nonstandard')
          expect(prop.type).to.equal('unknown')

          ICAL.design.defaultSet.property['nonstandard'] = {
            defaultType: 'date-time'
          }

          prop = new ICAL.Property('nonstandard')
          expect(prop.type).to.equal('date-time')
        })

        it('unknown value type', () => {
          const prop = ICAL.Property.fromString('X-PROP;VALUE=FUZZY:WARM')
          expect(prop.name).to.equal('x-prop')
          expect(prop.type).to.equal('fuzzy')
          expect(prop.getFirstValue()).to.equal('WARM')
          prop.setValue('FREEZING')
          expect(prop.getFirstValue()).to.equal('FREEZING')
        })

        it('newly registered value type', () => {
          ICAL.design.defaultSet.value['fuzzy'] = {
            fromICAL: function (aValue) {
              return aValue.toLowerCase()
            },
            toICAL: function (aValue) {
              return aValue.toUpperCase()
            }
          }

          const prop = ICAL.Property.fromString('X-PROP;VALUE=FUZZY:WARM')
          expect(prop.name).to.equal('x-prop')
          expect(prop.getFirstValue()).to.equal('warm')
          expect(prop.toICALString()).to.match(/WARM/)
        })

        it('newly registered parameter', () => {
          let prop = ICAL.Property.fromString('X-PROP;VALS=a,b,c:def')
          let param = prop.getParameter('vals')
          expect(param).to.equal('a,b,c')

          ICAL.design.defaultSet.param['vals'] = { multiValue: ',' }

          prop = ICAL.Property.fromString('X-PROP;VALS=a,b,c:def')
          param = prop.getParameter('vals')
          expect(param).to.deep.equal(['a', 'b', 'c'])
        })
      })
    })
  })
})
