import { getICAL } from './ical'
import { expect } from 'chai'
import { defineSample, useTimezones } from './helper'
import { describe, it, beforeEach } from 'mocha'

const ICAL = getICAL()

describe('ICAL.Event', async () => {

  const testTzid = 'America/New_York'
  useTimezones(ICAL, testTzid)

  const icsData = await defineSample('recur_instances.ics')

  function rangeException(subject: ical.Event, nth: number) {
    if (!nth || nth <= 0) {
      nth = 1
    }

    const iter = subject.iterator()
    let last: ical.Time

    while (nth--) {
      last = iter.next()
    }

    const newEvent = new ICAL.Event()
    newEvent.uid = subject.uid
    newEvent.component
      .addPropertyWithValue('recurrence-id', last!)
      .setParameter('range', subject.THISANDFUTURE)

    return newEvent
  }

  let exceptions: ical.Component[]
  let primaryItem: ical.Component

  function flush() {
    exceptions = []
    const root = new ICAL.Component(ICAL.parse(icsData))

    const events = root.getAllSubcomponents('vevent')
    ICAL.TimezoneService.register(root.getFirstSubcomponent('vtimezone')!)

    events.forEach((event) => {
      if (!event.hasProperty('recurrence-id')) {
        primaryItem = event
      } else {
        exceptions.push(event)
      }
    })
  }
  beforeEach(flush)

  describe('changing timezones', () => {
    const dateFields = [
      ['startDate', 'dtstart'],
      ['endDate', 'dtend']
    ]

    function verifyTzidHandling(this: void, eventProp: string, icalProp: string) {
      const subject = new ICAL.Event(primaryItem!)
      const property = subject.component.getFirstProperty(icalProp)!
      expect(property.getParameter('tzid'), 'has tzid')
      expect(property.getParameter('tzid') === testTzid).to.be.false

      it('to floating time', () => {
        const time = subject[eventProp] = new ICAL.Time({
          year: 2012,
          month: 1,
          day: 1,
          minute: 30,
          isDate: false
        })

        expect(!property.getParameter('tzid'), 'removes tzid')

        expect(
          property.toICALString()
        ).to.include(
          time.toICALString()
        )
      })

      it('to utc time', () => {
        const time = subject[eventProp] = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          minute: 30,
          isDate: false,
          timezone: 'Z'
        })

        expect(
          !property.getParameter('tzid'),
          'removes tzid'
        )

        expect(
          property.toICALString()
        ).to.include(
          time.toICALString()
        )
      })

      it('to another timezone', () => {
        const time = subject[eventProp] = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          minute: 30,
          isDate: false,
          timezone: testTzid
        })

        expect(property.getParameter('tzid')).to.equal(testTzid)

        expect(
          property.toICALString()
        ).to.include(
          time.toICALString()
        )
      })

      it('type date-time -> date', () => {
        // ensure we are in the right time type
        property.resetType('date-time')

        const time = subject[eventProp] = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          isDate: true
        })

        expect(property.type).to.equal('date')

        expect(
          property.toICALString()
        ).to.include(
          time.toICALString()
        )
      })

      it('type date -> date-time', () => {
        // ensure we are in the right time type
        property.resetType('date')

        const time = subject[eventProp] = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          hour: 3,
          isDate: false
        })

        expect(property.type).to.equal('date-time')

        expect(
          property.toICALString()
        ).to.include(
          time.toICALString()
        )
      })
    }

    dateFields.forEach(([eventProp, icalProp]) => {
      describe(eventProp, () => verifyTzidHandling(eventProp, icalProp))
    })
  })

  describe('initializer', () => {
    const subject = new ICAL.Event(primaryItem!)

    it('only with component', () => {
      expect(subject.component).to.equal(primaryItem)
      expect(subject.rangeExceptions).to.be.an('array')
    })

    it('with exceptions from the component\'s parent if not specified in options', () => {
      const subject = new ICAL.Event(primaryItem)

      const expected = Object.create(null)
      exceptions.forEach((exception) => {
        expected[exception.getFirstPropertyValue('recurrence-id').toString()] = new ICAL.Event(exception)
      })

      expect(subject.exceptions).to.deep.equal(expected)
    })

    it('with exceptions specified in options if any', () => {
      const subject = new ICAL.Event(primaryItem, {
        exceptions: exceptions.slice(1)
      })

      const expected = Object.create(null)
      exceptions.slice(1).forEach((exception) => {
        expected[exception.getFirstPropertyValue('recurrence-id').toString()] = new ICAL.Event(exception)
      })

      expect(subject.exceptions).to.deep.equal(expected)
    })

    it('with strict exceptions', () => {
      const subject = new ICAL.Event(primaryItem, {
        strictExceptions: true
      })
      expect(subject.strictExceptions)
    })
  })

  describe('creating a event', () => {
    const subject = new ICAL.Event()

    it('initial state', () => {
      expect(subject.component).to.be.instanceOf(ICAL.Component)
      expect(subject.component.name).to.equal('vevent')
    })

    describe('roundtrip', () => {
      const props = {
        uid: 'zfoo',
        summary: 'sum',
        description: 'desc',
        startDate: new ICAL.Time({
          year: 2012,
          month: 1,
          day: 1,
          hour: 5
        }),
        endDate: new ICAL.Time({
          year: 2012,
          month: 1,
          day: 1,
          hour: 10
        }),
        location: 'place',
        organizer: 'SJL',
        recurrenceId: new ICAL.Time({
          year: 2012,
          month: 1,
          day: 1
        })
      }

      it('setters', () => {
        for (const key in props) {
          subject[key] = props[key]
          expect(subject[key]).to.equal(props[key], key)
        }
      })

      it('to string roundtrip', () => {
        const aComp = new ICAL.Component(ICAL.parse(icsData))
        const aEvent = new ICAL.Event(aComp)

        const bComp = new ICAL.Component(
          ICAL.parse(aComp.toString())
        )

        const bEvent = new ICAL.Event(bComp)
        expect(aEvent.toString()).to.equal(bEvent.toString())
      })
    })

  })

  describe('#getOccurrenceDetails', () => {
    const subject = new ICAL.Event(primaryItem!)
    exceptions.forEach(subject.relateException, subject)

    describe('RANGE=THISANDFUTURE', () => {
      it('starts earlier ends later', () => {
        const exception = rangeException(subject, 1)
        const rid = exception.recurrenceId
        rid.clone()

        exception.startDate = rid.clone()
        exception.endDate = rid.clone()

        // starts 2 hours & 2 min early
        exception.startDate.hour -= 2
        exception.startDate.minute += 2

        // starts 1 hour - 2 min later
        exception.endDate.hour += 1
        exception.endDate.minute -= 2

        subject.relateException(exception)

        // create a time that has no exception
        // but past the RID.
        const occurs = rid.clone()
        occurs.day += 3
        occurs.hour = 13
        occurs.minute = 15

        // Run the following tests twice, the second time around the results
        // will be cached.
        for (let i = 0; i < 2; i++) {
          const suffix = (i === 1 ? ' (cached)' : '')
          const details = subject.getOccurrenceDetails(
            occurs
          )

          expect(details, 'has details' + suffix)
          expect(details.item).to.equal(exception, 'uses exception' + suffix)


          const expectedStart = occurs.clone()
          const expectedEnd = occurs.clone()

          // same offset (in different day) as the difference
          // in the original exception.d
          expectedStart.hour -= 2
          expectedStart.minute += 2
          expectedEnd.hour += 1
          expectedEnd.minute -= 2

          expect(
            details.startDate.toJSDate()
          ).to.deep.equal(
            expectedStart.toJSDate(),
            'start time offset' + suffix
          )

          expect(
            details.endDate.toJSDate()
          ).to.deep.equal(
            expectedEnd.toJSDate(),
            'end time offset' + suffix
          )
        }
      })
    })

    it('exception', function () {
      const time = exceptions[0].getFirstPropertyValue('recurrence-id')

      const start = exceptions[0].getFirstPropertyValue('dtstart')
      const end = exceptions[0].getFirstPropertyValue('dtend')

      const result = subject.getOccurrenceDetails(time)

      expect(
        result.recurrenceId.toString()).to.equal(
        time.toString(),
        'recurrence id'
      )

      expect(
        result.endDate.toString()).to.equal(
        end.toString(),
        'end date'
      )

      expect(
        result.startDate.toString()).to.equal(
        start.toString(),
        'start date'
      )

      expect(
        result.item.component.toJSON()
      ).to.deep.equal(
        exceptions[0].toJSON(),
        'item'
      )
    })

    it('non-exception', function () {

      const time = new ICAL.Time({
        year: 2012,
        month: 7,
        day: 12
      })

      const end = time.clone()
      end.addDuration(subject.duration)

      const result = subject.getOccurrenceDetails(time)

      expect(result.startDate.toString()).to.equal(
        time.toString(),
        'start date'
      )

      expect(result.endDate.toString()).to.equal(end.toString())
      expect(result.recurrenceId.toString()).to.equal(time.toString())
      expect(result.item).to.equal(subject)
    })

    it('iterate over exceptions', function () {
      for (let counter = 0, iterator = subject.iterator(); counter < 2; counter++) {
        const result = subject.getOccurrenceDetails(iterator.next())
        const exception = exceptions[counter]

        expect(result.endDate.toString()).to.equal(
          exception.getFirstPropertyValue('dtend').toString(),
          'end date'
        )

        expect(result.startDate.toString()).to.equal(
          exception.getFirstPropertyValue('dtstart').toString(),
          'start date'
        )

        expect(
          result.item.component.toJSON()
        ).to.deep.equal(
          exception.toJSON(),
          'item'
        )
      }
    })
  })

  describe('#recurrenceTypes', function () {
    const subject = new ICAL.Event(primaryItem!)
    describe('multiple rrules', async function () {
      const icsData = await defineSample('multiple_rrules.ics')

      it('result', function () {
        const component = new ICAL.Component(ICAL.parse(icsData))
        const subject = new ICAL.Event(component.getFirstSubcomponent('vevent'))

        const expected = {
          'MONTHLY': true,
          'WEEKLY': true
        }

        expect(subject.getRecurrenceTypes()).to.deep.equal(expected)
      })
    })

    it('no rrule', () => {
      subject.component.removeProperty('rrule')
      expect(subject.getRecurrenceTypes()).to.be.empty
    })
  })

  describe('#relateException', () => {
    const subject = new ICAL.Event(primaryItem!)

    it('trying to relate an exception to an exception', () => {
      const exception = new ICAL.Event(exceptions[0])

      expect(() => {
        exception.relateException(exceptions[1])
      }).to.throw()
    })

    it('trying to relate unrelated component (without strict)', () => {
      const exception = exceptions[0]
      const prop = exception.getFirstProperty('uid')!
      prop.setValue('foo')

      subject.relateException(exception)
    })

    it('trying to relate unrelated component (with strict)', () => {
      const exception = exceptions[0]
      const prop = exception.getFirstProperty('uid')!
      prop.setValue('foo')

      subject.strictExceptions = true
      expect(function () {
        subject.relateException(exception)
      }).to.throw(/unrelated/)
    })

    it('from ical component', function () {
      const subject = new ICAL.Event(primaryItem, { exceptions: [] })
      const exception = exceptions[0]
      subject.relateException(exception)

      const expected = Object.create(null)
      expected[exception.getFirstPropertyValue('recurrence-id').toString()] = new ICAL.Event(exception)

      expect(subject.exceptions).to.deep.equal(expected)
      expect(subject.rangeExceptions, 'does not add range').to.be.empty
    })

    describe('with RANGE=THISANDFUTURE', () => {
      function exceptionTime(index: number, mod = 0) {
        const item = subject.rangeExceptions[index]
        const utc = item[0]
        const time = new ICAL.Time()
        time.fromUnixTime(utc + mod)

        return time
      }

      const list = [
        rangeException(subject, 3),
        rangeException(subject, 10),
        rangeException(subject, 1)
      ]

      list.forEach(subject.relateException.bind(subject))
      expect(subject.rangeExceptions).to.have.lengthOf(3)

      function nthRangeException(nth) {
        return subject.rangeExceptions[nth]
      }

      function listDetails(obj) {
        return [
          obj.recurrenceId.toUnixTime(),
          obj.recurrenceId.toString()
        ]
      }

      it('ranges', function () {
        const expected = [
          listDetails(list[2]), // 1st
          listDetails(list[0]), // 2nd
          listDetails(list[1])  // 3rd
        ]

        expect(
          subject.rangeExceptions).to.equal(
          expected
        )
      })

      it('#findRangeException', function () {
        const before = exceptionTime(0, -1)
        const on = exceptionTime(0)
        const first = exceptionTime(0, 1)
        const second = exceptionTime(1, 30)
        const third = exceptionTime(2, 100000)

        expect(
          !subject.findRangeException(before),
          'find before range'
        )

        expect(
          !subject.findRangeException(on),
          'day of exception does not need a modification'
        )

        expect(
          subject.findRangeException(first)).to.equal(
          nthRangeException(0)[1],
          'finds first item'
        )

        expect(
          subject.findRangeException(second)).to.equal(
          nthRangeException(1)[1],
          'finds second item'
        )

        expect(
          subject.findRangeException(third)).to.equal(
          nthRangeException(2)[1],
          'finds third item'
        )
      })
    })
  })

  describe('#isRecurring', function () {
    const subject = new ICAL.Event(primaryItem!)
    it('when is primary recurring item', function () {
      expect(subject.isRecurring()).is.true
    })

    it('when is exception', function () {
      const subject = new ICAL.Event(exceptions[0])
      expect(subject.isRecurring()).is.false
    })
  })

  describe('#modifiesFuture', () => {
    const subject = new ICAL.Event(primaryItem!)
    it('without range or exception', () => {
      expect(subject.isRecurrenceException()).is.false
      expect(subject.modifiesFuture()).is.false
    })

    it('with range and exception', () => {
      subject.component
        .addPropertyWithValue(
          'recurrence-id',
          ICAL.Time.fromJSDate(new Date()))
        .setParameter(
          'range',
          subject.THISANDFUTURE)

      expect(subject.modifiesFuture()).is.true
    })
  })

  describe('#isRecurrenceException', () => {
    const subject = new ICAL.Event(primaryItem!)
    it('when is primary recurring item', () => {
      expect(subject.isRecurrenceException()).is.false
    })

    it('when is exception', () => {
      const subject = new ICAL.Event(exceptions[0])
      expect(subject.isRecurrenceException()).is.true
    })
  })

  describe('date props', () => {
    const subject = new ICAL.Event(primaryItem!);

    [
      ['dtstart', 'startDate'],
      ['dtend', 'endDate']
    ].forEach(function (dateType) {
      const ical = dateType[0]
      const prop = dateType[1]
      let timeProp
      let changeTime

      describe(`#${prop}`, function () {
        const tzid = 'America/Denver'
        useTimezones(ICAL, tzid)

        timeProp = primaryItem.getFirstProperty(ical)

        it('get', function () {
          const expected = timeProp.getFirstValue(ical)
          expect(expected).to.deep.equal(subject[prop])
        })

        function changesTzid(newTzid) {
          expect(
            timeProp.getFirstValue().zone.tzid
          ).to.not.equal(
            changeTime.zone.tzid,
            'zones are different'
          )

          subject[prop] = changeTime
          expect(
            newTzid).to.equal(
            timeProp.getParameter('tzid'),
            'removes timezone id'
          )
        }

        it('changing timezone from America/Los_Angeles', function () {
          changeTime = new ICAL.Time({
            year: 2012,
            month: 1,
            timezone: tzid
          })

          changesTzid(tzid)
        })

        it('changing timezone from floating to UTC', function () {
          timeProp.setValue(new ICAL.Time({
            year: 2012,
            month: 1
          }))

          changeTime = new ICAL.Time({
            year: 2012,
            month: 1,
            timezone: 'Z'
          })

          changesTzid(undefined)
        })

        it('changing timezone to floating', function () {
          timeProp.setValue(new ICAL.Time({
            year: 2012,
            month: 1,
            timezone: 'Z'
          }))

          changeTime = new ICAL.Time({
            year: 2012,
            month: 1
          })

          changesTzid(undefined)
        })

      })

    })
  })

  describe('remaining properties', function () {
    const subject = new ICAL.Event(primaryItem!)
    function testProperty(prop, changeval) {
      it('#' + prop, function () {
        const expected = primaryItem.getFirstPropertyValue(prop)
        expect(subject[prop]).to.deep.equal(expected)

        subject[prop] = changeval
        expect(primaryItem.getFirstPropertyValue(prop)).to.equal(changeval)
      })
    }

    testProperty('location', 'other')
    testProperty('summary', 'other')
    testProperty('description', 'other')
    testProperty('organizer', 'other')
    testProperty('uid', 'other')
    testProperty('sequence', 123)

    it('#duration', function () {
      const end = subject.endDate
      const start = subject.startDate
      const duration = end.subtractDate(start)

      expect(subject.duration.toString()).to.equal(duration.toString())
    })

    it('#attendees', function () {
      const props = primaryItem.getAllProperties('attendee')
      expect(subject.attendees).to.deep.equal(props)
    })

    it('#recurrenceId', function () {
      const subject = new ICAL.Event(exceptions[0])
      const expected = exceptions[0].getFirstPropertyValue('recurrence-id')
      const changeval = exceptions[1].getFirstPropertyValue('recurrence-id')
      expect(subject.recurrenceId).to.deep.equal(expected)

      subject.recurrenceId = changeval
      expect(subject.component.getFirstPropertyValue('recurrence-id')).to.deep.equal(changeval)
    })
  })

  describe('#iterator', () => {
    const subject = new ICAL.Event(primaryItem!)
    it('with start time', () => {
      const start = subject.startDate
      const time = new ICAL.Time({
        day: start.day + 1,
        month: start.month,
        year: start.year
      })

      const iterator = subject.iterator(time)
      expect(iterator.last.toString()).to.deep.equal(time.toString())
      expect(iterator).to.be.instanceOf(ICAL.RecurExpansion)
    })

    it('without a start time', function () {
      const iterator = subject.iterator()

      expect(
        iterator.last.toString()).to.equal(
        subject.startDate.toString()
      )
    })
  })

  describe('duration instead of dtend', async () => {
    const icsData = await defineSample('duration_instead_of_dtend.ics')

    it('result', function () {
      const component = new ICAL.Component(ICAL.parse(icsData))
      const subject = new ICAL.Event(component.getFirstSubcomponent('vevent'))
      expect(subject.startDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 6,
        day: 30,
        hour: 6,
        isDate: false,
        timezone: testTzid
      }).toString())

      expect(subject.endDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 7,
        day: 1,
        hour: 6,
        isDate: false,
        timezone: testTzid
      }).toString())

      expect(subject.duration.toString()).to.equal('P1D')
    })

    it('set', function () {
      const component = new ICAL.Component(ICAL.parse(icsData))
      const subject = new ICAL.Event(component.getFirstSubcomponent('vevent'))

      expect(subject.toString()).to.include('DURATION')
      expect(subject.toString()).to.not.include('DTEND')

      subject.endDate = new ICAL.Time({
        year: 2012,
        month: 7,
        day: 2,
        hour: 6,
        isDate: false,
        timezone: testTzid
      })

      expect(subject.duration.toString()).to.equal('P2D')
      expect(subject.endDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 7,
        day: 2,
        hour: 6,
        isDate: false,
        timezone: testTzid
      }).toString())

      expect(subject.toString()).to.not.include('DURATION')
      expect(subject.toString()).to.include('DTEND')
    })
  })

  describe('only a dtstart date', async function () {
    const icsData = await defineSample('only_dtstart_date.ics')

    it('result', function () {
      const component = new ICAL.Component(ICAL.parse(icsData))
      const subject = new ICAL.Event(component.getFirstSubcomponent('vevent'))
      expect(subject.startDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 6,
        day: 30,
        hour: 0,
        isDate: true,
        timezone: testTzid
      }).toString())

      expect(subject.endDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 7,
        day: 1,
        hour: 6,
        isDate: true,
        timezone: testTzid
      }).toString())

      expect(subject.duration.toString()).to.equal('P1D')
    })
  })

  describe('only a dtstart time', async function () {
    const icsData = await defineSample('only_dtstart_time.ics')

    it('result', function () {
      const component = new ICAL.Component(ICAL.parse(icsData))
      const subject = new ICAL.Event(component.getFirstSubcomponent('vevent')!)
      expect(subject.startDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 6,
        day: 30,
        hour: 6,
        isDate: false,
        timezone: testTzid
      }).toString())

      expect(subject.endDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 6,
        day: 30,
        hour: 6,
        isDate: false,
        timezone: testTzid
      }).toString())

      expect(subject.duration.toString()).to.equal('PT0S')
    })
  })

  describe('dtend instead of duration', async function () {
    const icsData = await defineSample('minimal.ics')

    it('set', function () {
      const component = new ICAL.Component(ICAL.parse(icsData))
      const subject = new ICAL.Event(component.getFirstSubcomponent('vevent')!)

      expect(subject.toString()).to.not.include('DURATION')
      expect(subject.toString()).to.include('DTEND')

      subject.duration = ICAL.Duration.fromString('P2D')

      expect(subject.duration.toString()).to.equal('P2D')
      expect(subject.endDate.toString()).to.equal(new ICAL.Time({
        year: 2012,
        month: 7,
        day: 2,
        hour: 6,
        isDate: false,
        timezone: testTzid
      }).toString())

      expect(subject.toString()).to.include('DURATION')
      expect(subject.toString()).to.not.include('DTEND')
    })
  })
})
