import * as ICAL from './ical'
import { describe } from 'mocha'
import { expect } from 'chai'

describe('ical/period', () => {
  const start = ICAL.Time.fromString('1970-01-02T03:04:05Z')
  const end = ICAL.Time.fromString('1970-01-02T03:04:05Z')
  const duration = ICAL.Duration.fromString('PT3H2M1S')

  describe('#fromString', () => {
    function verify(string: string, icalstring: string, data: any) {
      it('parse: "' + string + '"', () => {
        const subject = ICAL.Period.fromString(string)

        expect(subject.toICALString()).to.equal(icalstring)
        expect(subject.toString()).to.equal(string)

        if ('start' in data) {
          expect(subject.start).to.be.instanceOf(ICAL.Time)
          expect(subject.start).to.include(data.start, 'start property')
        }

        if ('end' in data) {
          if (data.end) {
            expect(subject.end).to.be.instanceOf(ICAL.Time)
            expect(subject.end).to.include(data.end, 'end property')
          } else {
            expect(subject.end).to.not.exist
          }
        }

        if ('duration' in data) {
          if (data.duration) {
            expect(subject.duration).to.be.instanceOf(ICAL.Duration)
            expect(subject.duration).to.include(data.duration, 'duration property')
          } else {
            expect(subject.duration).to.not.exist
          }
        }

        if ('calculatedDuration' in data) {
          const dur = subject.getDuration()

          if ('duration' in data && data.duration) {
            expect(dur).to.include(data.duration, 'duration matches calculated')
          }
          expect(dur).to.include(data.calculatedDuration)
        }
        if ('calculatedEnd' in data) {
          const end = subject.getEnd()
          if ('end' in data && data.end) {
            expect(end).to.include(data.end, 'duration matches calculated')
          }
          expect(end).to.include(data.calculatedEnd)
        }
      })
    }

    function verifyFail(testname: string, string, errorParam: string | RegExp) {
      it('invalid input "' + string + '"', () => {
        expect(() => {
          ICAL.Period.fromString(string)
        }).to.throw(errorParam)
      })
    }

    verifyFail('missing slash', '1997-01-01T18:30:20Z1997-01-02T07:00:00Z', /Invalid string value/)
    verifyFail('invalid start date', 'some time before/1997-01-02T07:00:00Z', /invalid date-time value/)
    verifyFail('invalid end param', '1997-01-02T07:00:00Z/some time after', /invalid date-time value/)
    verifyFail('invalid end param that might be a duration', '1997-01-02T07:00:00Z/Psome time after', /invalid duration value/)

    verify('1997-01-01T18:30:20Z/1997-01-02T07:00:00Z', '19970101T183020Z/19970102T070000Z', {
      start: {
        year: 1997,
        month: 1,
        day: 1,
        hour: 18,
        minute: 30,
        second: 20
      },

      end: {
        year: 1997,
        month: 1,
        day: 2,
        hour: 7
      },

      duration: null,
      calculatedDuration: {
        isNegative: false,
        hours: 12,
        minutes: 29,
        seconds: 40
      },
      calculatedEnd: {
        year: 1997,
        month: 1,
        day: 2,
        hour: 7,
      },
    })

    verify('1997-01-01T18:00:00Z/PT5H30M', '19970101T180000Z/PT5H30M', {
      start: {
        year: 1997,
        month: 1,
        day: 1,
        hour: 18
      },
      duration: {
        isNegative: false,
        hours: 5,
        minutes: 30
      },
      end: null,
      calculatedDuration: {
        isNegative: false,
        hours: 5,
        minutes: 30
      },
      calculatedEnd: {
        year: 1997,
        month: 1,
        day: 1,
        hour: 23,
        minute: 30
      }
    })

  })

  describe('#fromData', () => {
    it('valid start,end', () => {
      const subject = ICAL.Period.fromData({
        start: start,
        end: end
      })

      expect(subject.start).to.include(start, 'start date')
      expect(subject.end).to.include(end, 'end date')
      expect(subject.duration).to.be.null
    })
    it('valid start,duration', () => {
      const subject = ICAL.Period.fromData({
        start: start,
        duration: duration,
      })

      expect(subject.start).to.include(start, 'start date')
      expect(subject.end).to.be.null
      expect(subject.duration).to.include(duration, 'duration')
    })

    it('end value exists but is null', () => {
      const subject = ICAL.Period.fromData({
        start: start,
      })
      expect(subject.start).to.include(start, 'start date')
      expect(subject.end).to.be.null
      expect(subject.duration).to.be.null
    })

    it('start value exists but is null', () => {
      const subject = ICAL.Period.fromData({
        duration: duration,
      })
      expect(subject.start).to.be.null
      expect(subject.end).to.be.null
      expect(subject.duration).to.include(duration, 'duration')
    })

    it('duration value exists but is null', () => {
      const subject = ICAL.Period.fromData({
        start: start,
        duration: null,
      })
      expect(subject.start).to.include(start, 'start date')
      expect(subject.end).to.be.null
      expect(subject.duration).to.be.null
    })

    it('start,end and duration', () => {
      expect(() => {
        ICAL.Period.fromData({
          start: start,
          end: end,
          duration: duration
        })
      }).to.throw(/cannot accept both end and duration/)
    })

    it('start,end and duration but one is null', () => {
      const subject = ICAL.Period.fromData({
        start: start,
        duration: duration
      })
      expect(subject.start, start).to.include('start date')
      expect(subject.end).to.be.null
      expect(subject.duration).to.include(duration, 'duration')
    })

    it('invalid start value', () => {
      expect(() => {
        ICAL.Period.fromData({
          start: '1970-01-02T03:04:05Z',
          end: end
        })
      }).to.throw(/start must be an instance/)
    })
    it('invalid end value', () => {
      expect(() => {
        ICAL.Period.fromData({
          start: start,
          end: '1970-01-02T03:04:05Z'
        })
      }).to.throw(/end must be an instance/)
    })
    it('invalid duration value', () => {
      expect(() => {
        ICAL.Period.fromData({
          start: start,
          duration: 'PT1S',
        })
      }).to.throw(/duration must be an instance/)
    })
  })

  describe('#toString', () => {
    it('start,end', () => {
      const subject = ICAL.Period.fromData({
        start: start,
        end: end
      })
      expect(subject.toString()).to.equal('1970-01-02T03:04:05Z/1970-01-02T03:04:05Z')
    })
    it('start,duration', () => {
      const subject = ICAL.Period.fromData({
        start: start,
        duration: duration
      })
      expect(subject.toString()).to.equal('1970-01-02T03:04:05Z/PT3H2M1S')
    })
  })

  describe('generating jCal', () => {
    it('jCal from parser', () => {
      const prop = ICAL.parse.property('FREEBUSY:20140401T010101/PT1H')
      const val = prop[3]
      expect(val).to.deep.equal(['2014-04-01T01:01:01', 'PT1H'])
    })
    it('jCal from property', () => {
      const prop = ICAL.Property.fromString('FREEBUSY:20140401T010101/PT1H')
      const val = prop.getFirstValue().toJSON()
      expect(val).to.deep.equal(['2014-04-01T01:01:01', 'PT1H'])
    })
  })

  describe('#clone', () => {
    it('cloned start/duration', () => {
      const subjectstart = start.clone()
      const subjectduration = duration.clone()
      const subject1 = ICAL.Period.fromData({start: subjectstart, duration: subjectduration})
      const subject2 = subject1.clone()
      subjectstart.hour++
      subjectduration.hours++

      expect(subject1.start.hour).to.equal(4)
      expect(subject2.start.hour).to.equal(3)

      expect(subject1.duration.hours).to.equal(4)
      expect(subject2.duration.hours).to.equal(3)
    })
    it('cloned start/end', () => {
      const subjectstart = start.clone()
      const subjectend = end.clone()
      const subject1 = ICAL.Period.fromData({start: subjectstart, end: subjectend})
      const subject2 = subject1.clone()
      subjectstart.hour++
      subjectend.hour++

      expect(subject1.start.hour).to.equal(4)
      expect(subject2.start.hour).to.equal(3)

      expect(subject1.end.hour).to.equal(4)
      expect(subject2.end.hour).to.equal(3)
    })
    it('cloned empty object', () => {
      // most importantly, this shouldn't throw.
      const subject1 = ICAL.Period.fromData()
      const subject2 = subject1.clone()

      expect(subject1.start).to.equal(subject2.start)
      expect(subject1.end).to.equal(subject2.end)
      expect(subject1.duration).to.equal(subject2.duration)
    })
  })
})
