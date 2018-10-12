import * as ICAL from './ical'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { RecurOptions } from '../lib/ical/Recur'

describe('recur', () => {
  const Time = ICAL.Time

  describe('initialization', () => {
    it('empty init', () => {
      const recur = new ICAL.Recur()
      expect(recur.interval).to.equal(1)
      expect(recur.wkst).to.equal(ICAL.Time.MONDAY)
      expect(recur.until).is.null
      expect(recur.count).is.null
      expect(recur.freq).is.null
    })
  })

  describe('#iterator', () => {
    function checkDate(data, last, dtstart?) {
      const name = JSON.stringify(data)
      // XXX: better names
      it('RULE: ' + name, () => {
        const recur = new ICAL.Recur(data)
        if (dtstart) {
          dtstart = ICAL.Time.fromString(dtstart)
        } else {
          dtstart = ICAL.Time.epochTime.clone()
        }
        const iter = recur.iterator(dtstart)
        expect(iter.next()!.toString()).to.equal(last)
      })
    }

    function checkThrow(data, expectedMessage, dtstart?) {
      it(expectedMessage, () => {
        const recur = new ICAL.Recur(data)
        if (dtstart) {
          dtstart = ICAL.Time.fromString(dtstart)
        } else {
          dtstart = ICAL.Time.epochTime.clone()
        }
        expect(() => {
          recur.iterator(dtstart)
        }).to.throw(expectedMessage)
      })
    }

    checkThrow({
      parts: {
        BYYEARDAY: [3, 4, 5],
        BYMONTH: [2]
      }
    }, 'Invalid BYYEARDAY rule')

    checkThrow({
      parts: {
        BYWEEKNO: [3],
        BYMONTHDAY: [2]
      }
   }, 'BYWEEKNO does not fit to BYMONTHDAY')

    checkThrow({
      freq: 'MONTHLY',
      parts: {
        BYWEEKNO: [30]
      }
    }, 'For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear')

    checkThrow({
      freq: 'WEEKLY',
      parts: {
        BYMONTHDAY: [20]
      }
    }, 'For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear')

    checkThrow({
      freq: 'DAILY',
      parts: {
        BYYEARDAY: [200]
      }
    }, 'BYYEARDAY may only appear in YEARLY rules')

    checkThrow({
      freq: 'MONTHLY',
      parts: {
        BYDAY: ['-6TH']
      }
    }, 'Malformed values in BYDAY part', '1970-02-01T00:00:00Z')

    checkDate({
      freq: 'SECONDLY',
      parts: {
        BYSECOND: ['2'],
        BYMINUTE: ['2'],
        BYHOUR: ['2'],
        BYDAY: ['2'],
        BYMONTHDAY: ['2'],
        BYMONTH: ['2'],
        BYSETPOS: ['2']
      }
    }, '1970-01-01T00:00:00Z')

    checkDate({
      freq: 'MINUTELY',
      parts: {
        BYSECOND: [2, 4, 6],
        BYMINUTE: [1, 3, 5]
      }
    }, '1970-01-01T00:00:02Z')

    checkDate({
      freq: 'YEARLY',
      parts: {
        BYSECOND: [1],
        BYMINUTE: [2],
        BYHOUR: [3],
        BYMONTHDAY: [4],
        BYMONTH: [5]
      }
    }, '1970-05-04T03:02:01Z')

    checkDate({
      freq: 'WEEKLY',
      parts: {
        BYDAY: ['MO', 'TH', 'FR']
      }
    }, '1970-01-01T00:00:00Z')

    checkDate({
      freq: 'WEEKLY',
      parts: {
        BYDAY: ['MO', 'WE']
      }
    }, '1970-01-05T00:00:00Z')

    checkDate({
      freq: 'YEARLY',
      parts: {
        BYMONTH: [3]
      }
    }, '1970-03-05T00:00:00Z', '1970-01-05T00:00:00Z')

    checkDate({
      freq: 'YEARLY',
      parts: {
        BYDAY: ['FR'],
        BYMONTH: [12],
        BYMONTHDAY: [1]
      }
    }, '1972-12-01T00:00:00Z')

    checkDate({
      freq: 'MONTHLY',
      parts: {
        BYDAY: ['2MO']
      }
    }, '1970-01-12T00:00:00Z')

    checkDate({
      freq: 'MONTHLY',
      parts: {
        BYDAY: ['-3MO']
      }
    }, '1970-01-12T00:00:00Z')

    checkDate({
      freq: 'MONTHLY',
      parts: {
        BYDAY: ['WE'],
        BYMONTHDAY: [1]
      }
    }, '1970-04-01T00:00:00Z')

    // TODO bymonthday else part
    // TODO check weekly without byday instances + 1 same wkday
  })

  it('#clone', () => {
    const until = ICAL.Time.epochTime.clone()
    const a = new ICAL.Recur({
      interval: 2,
      wkst: 3,
      until: until,
      count: 5,
      freq: ICAL.FrequencyValues.YEARLY
    })

    const b = a.clone()

    expect(a.interval).to.equal(b.interval)
    expect(a.wkst).to.equal(b.wkst)
    expect(a.until.compare(b.until)).to.equal(0)
    expect(a.count).to.equal(b.count)
    expect(a.freq).to.equal(b.freq)

    b.interval++; b.wkst++; b.until.day++; b.count++
    b.freq = ICAL.FrequencyValues.WEEKLY

    expect(a.interval).to.not.equal(b.interval)
    expect(a.wkst).to.not.equal(b.wkst)
    expect(a.until.compare(b.until)).to.not.equal(0)
    expect(a.count).to.not.equal(b.count)
    expect(a.freq).to.not.equal(b.freq)
  })

  describe('ICAL.Recur#toJSON', () => {

    it('round-trip', () => {
      const recur = ICAL.Recur.fromString(
        'FREQ=MONTHLY;BYDAY=1SU,2MO;BYSETPOS=1;COUNT=10;UNTIL=20121001T090000'
      )

      const props = {
        byday: ['1SU', '2MO'],
        bysetpos: 1,
        until: '2012-10-01T09:00:00',
        freq: 'MONTHLY',
        count: 10
      }

      const result = recur.toJSON()
      expect(result).to.deep.equal(props)

      const fromJSON = new ICAL.Recur(result)

      expect(fromJSON.until).to.be.instanceOf(ICAL.Time)

      expect(fromJSON).to.include({
        freq: props.freq,
        count: props.count,
      })

      expect(fromJSON.parts).to.include({
        BYDAY: props.byday,
        BYSETPOS: [props.bysetpos]
      })
    })
  })

  it('components', () => {
    const until = ICAL.Time.epochTime.clone()
    const a = new ICAL.Recur({
      interval: 2,
      wkst: 3,
      until: until,
      count: 5,
      freq: ICAL.FrequencyValues.YEARLY,
    })

    a.parts = {
      BYDAY: ['-1SU']
    }

    expect(a.getComponent('BYDAY')).to.deep.equal(['-1SU'])
    expect(a.getComponent('BYWTF')).to.be.empty

    a.addComponent('BYDAY', '+2MO')
    expect(a.getComponent('byday')).to.deep.equal(['-1SU', '+2MO'])
    expect(a.getComponent('bywtf')).to.be.empty

    a.setComponent('BYDAY', ['WE', 'TH'])
    expect(a.getComponent('BYDAY')).to.deep.equal(['WE', 'TH'])

    a.addComponent('BYMONTHDAY', '31')
    expect(a.getComponent('bymonthday')).to.deep.equal(['31'])

    const comp = a.getComponent('BYDAY')
    expect(comp).to.have.lengthOf(2)
  })

  describe('#fromString', () => {

    function verify(string, options) {
      it('parse: "' + string + '"', () => {
        const result = ICAL.Recur.fromString(string)
        // HACK for until validation
        if (options.until) {
          const until = options.until
          delete options.until
          expect(result.until).to.include(until)
        }
        expect(result).to.include(options)
      })
    }

    function verifyFail(string, errorParam) {
      it('invalid input "' + string + '"', () => {
        expect(() => {
          ICAL.Recur.fromString(string)
        }).to.throw(errorParam)
      })
    }

    verifyFail('FREQ=FOOBAR', /invalid frequency/)
    verify('FREQ=YEARLY;BYYEARDAY=300,301,-1', {
      freq: 'YEARLY',
      parts: { BYYEARDAY: [300, 301, -1] }
    })

    verifyFail('BYYEARDAY=367', /BYYEARDAY/)
    verifyFail('BYYEARDAY=-367', /BYYEARDAY/)

    verify('FREQ=MONTHLY;BYMONTHDAY=+3', {
      freq: 'MONTHLY',
      parts: { BYMONTHDAY: [3] }
    })

    verify('FREQ=MONTHLY;BYMONTHDAY=-3', {
      freq: 'MONTHLY',
      parts: { BYMONTHDAY: [-3] }
    })

    verify('BYSECOND=10;BYMINUTE=11;BYHOUR=12;BYWEEKNO=53;BYSETPOS=30', {
      parts: {
        BYSECOND: [10],
        BYMINUTE: [11],
        BYHOUR: [12],
        BYWEEKNO: [53],
        BYSETPOS: [30]
      }
    })

    verify('FREQ=DAILY;INTERVAL=3;COUNT=10;', {
      freq: 'DAILY',
      count: 10,
      interval: 3
    })

    verify('BYDAY=1SU,MO,TU,-53MO,13FR', {
      parts: {
        BYDAY: ['1SU', 'MO', 'TU', '-53MO', '13FR']
      }
    })

    verifyFail('BYDAY=ZA,FO1', /invalid BYDAY/)

    verify('UNTIL=20121012T101507', {
      until: {
        year: 2012,
        month: 10,
        day: 12,
        hour: 10,
        minute: 15,
        second: 7,
      }
    })

    verify('WKST=SU', {
      wkst: 1
    })

    verifyFail('WKST=ofo', /invalid WKST/)

    // Zero or negative interval should be accepted as interval=1
    verify('INTERVAL=0', {
      interval: 1
    })
    verify('INTERVAL=-1', {
      interval: 1
    })
  })

  describe('#fromData', () => {

    function verify(data: Partial<RecurOptions>, options) {
      it('parse: "' + JSON.stringify(data) + '"', () => {
        expect(ICAL.Recur.fromData(data)).to.include(options)
      })
    }

    function verifyFail(data) {
      it('invalid input "' + JSON.stringify(data) + '"', () => {
        expect(() => {
          ICAL.Recur.fromString(data)
        }).to.throw()
      })
    }

    verify({}, {})

    // INTERVAL checks
    verify({ interval: 1 }, { interval: 1 })
    verify({ count: 1 }, { count: 1 })
    // @TODO disallow cast
    // verify({ interval: '1' }, { interval: 1 })
    verifyFail({ interval: 'NaN' })
  })

  describe('#getNextOccurrence', () => {
    it('basic test', () => {
      const rec = ICAL.Recur.fromString('FREQ=DAILY;INTERVAL=2')
      const dtstart = ICAL.Time.epochTime.clone()
      const recId = dtstart.clone()
      recId.day += 20

      const next = rec.getNextOccurrence(dtstart, recId)
      expect(next.toJSON()).to.deep.equal({
        year: 1970,
        month: 1,
        day: 23,
        hour: 0,
        minute: 0,
        second: 0,
        isDate: false,
        timezone: 'UTC'
      })
    })

    it('no next occurrence', () => {
      const rec = ICAL.Recur.fromString('FREQ=DAILY;INTERVAL=2;UNTIL=19700103T000000Z')
      const dtstart = ICAL.Time.epochTime.clone()
      const recId = dtstart.clone()
      recId.day += 20

      expect(rec.getNextOccurrence(dtstart, recId)).to.be.null
    })
  })

  describe('recur data types', () => {
    it('invalid freq', () => {
      expect(() => {
        ICAL.Recur.fromString('FREQ=123')
      }).to.throw(/invalid frequency/)
    })

    it('invalid wkst', () => {
      expect(() => {
        ICAL.Recur.fromString('FREQ=WEEKLY;WKST=DUNNO')
      }).to.throw(/invalid WKST value/)
    })

    it('invalid count', () => {
      expect(() => {
        ICAL.Recur.fromString('FREQ=WEEKLY;COUNT=MAYBE10')
      }).to.throw(/Could not extract integer from/)
    })

    it('invalid interval', () => {
      expect(() => {
        ICAL.Recur.fromString('FREQ=WEEKLY;INTERVAL=ADAGIO')
      }).to.throw(/Could not extract integer from/)
    })

    it('invalid numeric byday', () => {
      expect(() => {
        ICAL.Recur.fromString('FREQ=WEEKLY;BYDAY=1,2,3')
      }).to.throw(/invalid BYDAY value/)
    })

    it('extra structured recur values', () => {
      const rec = ICAL.Recur.fromString('RSCALE=ISLAMIC-CIVIL;FREQ=YEARLY;BYMONTH=9')
      expect(rec['rscale']).to.equal('ISLAMIC-CIVIL')
    })

    it('single BYxxx value from string', () => {
      const rec = ICAL.Recur.fromString('FREQ=MINUTELY;BYSECOND=5')
      const comp = rec.getComponent('bysecond')
      expect(comp.length).to.equal(1)
      expect(comp[0]).to.equal(5)
    })

    it('single BYxxx value from jCal', () => {
      const prop = new ICAL.Property('rrule')
      prop.setValue({ freq: 'minutely', bysecond: 5 })
      const val = prop.getFirstValue()

      const comp = val.getComponent('bysecond')
      expect(comp.length).to.equal(1)
      expect(comp[0]).to.equal(5)
    })

    it('multiple BYxxx values from string', () => {
      const rec = ICAL.Recur.fromString('FREQ=YEARLY;BYYEARDAY=20,30,40')
      const comp = rec.getComponent('byyearday')
      expect(comp).to.deep.equal([20, 30, 40])
    })

    it('multiple BYxxx values from jCal', () => {
      const prop = new ICAL.Property('rrule')
      prop.setValue({ freq: 'yearly', byyearday: [20, 30, 40] })
      const val = prop.getFirstValue()

      const comp = val.getComponent('byyearday')
      expect(comp).to.deep.equal([20, 30, 40])
    })

    it('can be saved to a property that will be serialized correctly', () => {
      const icalString = 'FREQ=WEEKLY;UNTIL=19700103T000000Z;WKST=SU;BYDAY=TU,TH'
      const recur = ICAL.Recur.fromString(icalString)
      const prop = new ICAL.Property('rrule')
      prop.setValue(recur)
      expect(prop.toICALString()).to.equal('RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=19700103T000000Z;WKST=SU')
    })
  })

  describe('#toString', () => {
    it('round trip', () => {
      const until = ICAL.Time.epochTime.clone()
      const data = {
        interval: 2,
        wkst: 3,
        until: until,
        count: 5,
        freq: ICAL.FrequencyValues.YEARLY,
        parts: {
          'BYDAY': 'TU',
          'BYMONTH': '1'
        }
      }

      const a = new ICAL.Recur(data)
      const output = a.toString()
      const b = ICAL.Recur.fromString(output)

      expect(a.toString(), 'outputs')

      expect(output).to.include(';UNTIL=19700101T000000Z')
      // wkst 3 == TU see DOW_MAP
      expect(output).to.include('WKST=TU')
      expect(output).to.include('COUNT=5')
      expect(output).to.include('INTERVAL=2')
      expect(output).to.include('FREQ=YEARLY')
      expect(output).to.include('BYMONTH=1')
      expect(output).to.include('BYDAY=TU')

      expect(a.toString()).to.equal(b.toString(), 'roundtrip equality')
    })
    it('not all props', () => {
      const a = new ICAL.Recur({ freq: ICAL.FrequencyValues.YEARLY, })
      expect(a.toString()).to.equal('FREQ=YEARLY')
    })
  })

  describe('ICAL.Recur#icalDayToNumericDay', () => {
    const expected = {
      'SU': Time.SUNDAY,
      'MO': Time.MONDAY,
      'TU': Time.TUESDAY,
      'WE': Time.WEDNESDAY,
      'TH': Time.THURSDAY,
      'FR': Time.FRIDAY,
      'SA': Time.SATURDAY
    }

    for (const map in expected) {
      (function (map) {
        it(map + ' to constant', () => {
          expect(ICAL.Recur.icalDayToNumericDay(map)).to.equal(
            expected[map]
          )
        })
      }(map))
    }
  })

  describe('ICAL.Recur#numericDayToIcalDay', () => {
    const expected = {
      [Time.SUNDAY]: 'SU',
      [Time.MONDAY]: 'MO',
      [Time.TUESDAY]: 'TU',
      [Time.WEDNESDAY]: 'WE',
      [Time.THURSDAY]: 'TH',
      [Time.FRIDAY]: 'FR',
      [Time.SATURDAY]: 'SA',
    }
    for (const map of Object.keys(expected)) {
      it(`${map} to ${expected[map]}`, () => {
        expect(
          ICAL.Recur.numericDayToIcalDay(+map)).to.equal(
          expected[map]
        )
      })
    }
  })

})
