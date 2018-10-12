import * as ICAL from './ical'
import { expect } from 'chai'
import { describe, it } from 'mocha'

describe('Property', function () {
  const fixtures = {
    component: [ 'vevent', [], [] ],
    vcardComponent: ['vcard', [], []],

    noValue: [
      'x-foo',
      { prop: 'prop' },
      'text'
    ],

    textProp: [
      'description',
      {},
      'text',
      'foo'
    ],

    withParams: [
      'x-foo',
      {
        'rsvp': 'TRUE',
        'meta': 'foo'
      },
      'date',
      '2012-10-01'
    ],

    decoratedMultiValue: [
      'rdate',
      {},
      'date',
      '2012-10-10',
      '2012-10-11'
    ],

    mutliTextValue: [
      'categories',
      {},
      'text',
      'one',
      'two',
      'three'
    ]
  }

  describe('initialization', function () {

    it('undecorated', function () {
      const subject = new ICAL.Property(
        fixtures.textProp,
        new ICAL.Component(fixtures.component)
      )

      expect(subject.jCal).to.equal(fixtures.textProp)
      expect(subject.name).to.equal('description')
      expect(subject.type).to.equal('text')

      expect(subject.isDecorated).to.be.false
    })

    it('multi value', function () {
      let subject = new ICAL.Property('categories')
      expect(subject.isMultiValue, 'is multiValue').to.be.true

      subject = new ICAL.Property('url')
      expect(subject.isMultiValue, 'is not multiValue').to.be.false
    })

    it('structured value', function () {
      let subject = new ICAL.Property('request-status')
      expect(subject.isStructuredValue, 'is structured value').to.be.true

      subject = new ICAL.Property('url')
      expect(subject.isStructuredValue, 'is not structured value').to.be.false
    })

    it('decorated', function () {
      const subject = new ICAL.Property(
        fixtures.withParams,
        new ICAL.Component(fixtures.component)
      )
      expect(subject.isDecorated).to.be.true
    })

    it('new property by name with type', function () {
      const subject = new ICAL.Property('dtstart')
      expect(subject.type).to.equal('date-time')
      expect(subject.jCal[2]).to.equal('date-time')
      expect(subject['_designSet']).to.equal(ICAL.design.icalendar)
    })

    it('new vcard property without parent (unknown type)', function () {
      const subject = new ICAL.Property('anniversary')
      expect(subject.type).to.equal('unknown')
      expect(subject.jCal[2]).to.equal('unknown')
      expect(subject['_designSet']).to.equal(ICAL.design.icalendar)
    })

    it('new vcard property with vcard parent (known type)', function () {
      const parent = new ICAL.Component(fixtures.vcardComponent)
      const subject = new ICAL.Property('anniversary', parent)
      expect(subject.type).to.equal('date-and-or-time')
      expect(subject.jCal[2]).to.equal('date-and-or-time')
      expect(subject['_designSet']).to.equal(ICAL.design.vcard)
    })

    it('custom design value without defaultType', function () {
      ICAL.design.defaultSet.property['custom'] = {}
      const subject = new ICAL.Property('custom')
      expect(subject.type).to.equal(ICAL.design.defaultType)
      expect(subject.jCal[2]).to.equal(ICAL.design.defaultType)
      delete ICAL.design.defaultSet.property['custom']
    })

    it('new property by name (typeless)', function () {
      const subject = new ICAL.Property('description')
      expect(subject.name).to.equal('description')
      expect(subject.type).to.equal('text')
      expect(subject.jCal[2]).to.equal('text')
      expect(!subject.getFirstValue())
    })

    it('types change when changing design set', function () {
      const property = new ICAL.Property('fn')
      const component = new ICAL.Component('vcard')

      expect(property['_designSet']).to.equal(ICAL.design.defaultSet)
      expect(property.type, 'unknown')

      component.addProperty(property)
      expect(property['_designSet']).to.equal(ICAL.design.vcard)
      expect(property.type).to.equal('text')
    })

    describe('#fromString', function () {
      it('x-prop with known type', function () {
        const prop = ICAL.Property.fromString('X-FOO;VALUE=BOOLEAN:TRUE')
        expect(prop.name).to.equal('x-foo')
        expect(prop.type).to.equal('boolean')
        expect(prop.getFirstValue()).to.be.true
      })

      it('invalid prop', function () {
        expect(() => {
          ICAL.Property.fromString('BWAHAHAHAHA')
        }).to.throw(/invalid line/)
      })
    })
  })

  it('#getParameter', function () {
    const subject = new ICAL.Property(fixtures.withParams)
    expect(subject.getParameter('rsvp')).to.equal('TRUE')
    expect(subject.getParameter('wtf')).to.equal(undefined)
  })

  describe('#getFirstParameter', function () {
    it('with multivalue parameter', function () {
      const subject = new ICAL.Property('categories')
      subject.setParameter('categories', ['Home', 'Work'])
      expect(subject.getFirstParameter('categories')).to.equal('Home')
    })

    it('with string parameter', function () {
      const subject = new ICAL.Property(fixtures.withParams)
      expect(subject.getFirstParameter('rsvp')).to.equal('TRUE')
    })
  })

  it('#removeParameter', function () {
    const subject = new ICAL.Property(fixtures.withParams)

    subject.removeParameter('rsvp')
    expect(!subject.getParameter('rsvp'))
  })

  it('#setParameter', function () {
    const subject = new ICAL.Property(
      fixtures.textProp
    )

    subject.setParameter(
      'my-prop',
      'woot?'
    )

    expect(
      subject.getParameter('my-prop')).to.equal(
      'woot?'
    )

    expect(
      subject.jCal[1]).to.deep.equal(
      { 'my-prop': 'woot?' }
    )
  })

  it('#setMultiValueParameterByString', function () {
    const subject = new ICAL.Property(fixtures.withParams)
    subject.setParameter('member', 'mailto:users@example.net')
    expect(subject.getParameter('member')![0]).to.equal('mailto:users@example.net')
  })

  it('#setMultiValueParameter', function () {
    const subject = new ICAL.Property(fixtures.withParams)

    subject.setParameter(
      'member',
      ['mailto:users@example.net']
    )

    expect(subject.getParameter('member')![0]).to.equal(
     'mailto:users@example.net'
    )
  })

  describe('getFirstValue', function () {

    it('with no value', function () {
      const subject = new ICAL.Property(fixtures.noValue)
      expect(!subject.getFirstValue())
    })

    it('with decorated type', function () {
      const subject = new ICAL.Property(fixtures.withParams)
      const value = subject.getFirstValue()

      expect(value).to.be.instanceOf(ICAL.Time)
      // 2012-10-01
      expect(value).to.include(
        { year: 2012, month: 10, day: 1, isDate: true },
        'property correctness'
      )

      expect(subject.getFirstValue()).to.equal(
        subject.getFirstValue(),
        'decorated equality'
      )
    })

    it('without decorated type', function () {
      const subject = new ICAL.Property(fixtures.textProp)
      const value = subject.getFirstValue()
      expect(value).to.equal(subject.jCal[3])
    })
  })

  it('#resetType', function () {
    const subject = new ICAL.Property('dtstart')
    subject.setValue(new ICAL.Time({ year: 2012, hour: 10, minute: 1 }))

    expect(subject.type).to.equal('date-time')

    subject.resetType('date')
    expect(subject.type).to.equal('date')

    expect(!subject.getFirstValue())
    subject.setValue(new ICAL.Time({ year: 2012 }))
  })

  describe('#getDefaultType', function () {
    it('known type', function () {
      const subject = new ICAL.Property('dtstart')
      subject.setValue(new ICAL.Time({ year: 2012, hour: 20 }))

      expect(subject.type).to.equal('date-time')
      expect(subject.getDefaultType()).to.equal('date-time')

      subject.setValue(new ICAL.Time({ year: 2012 }))

      expect(subject.type).to.equal('date')
      expect(subject.getDefaultType()).to.equal('date-time')
    })

    it('unknown type', function () {
      const subject = new ICAL.Property('x-unknown')
      subject.setValue(new ICAL.Time({ year: 2012, hour: 20 }))

      expect(subject.getFirstValue().icaltype).to.equal('date-time')
      expect(subject.type).to.equal('date-time')
      expect(subject.getDefaultType()).to.equal('unknown')
    })

    it('vcard type', function () {
      const parent = new ICAL.Component(fixtures.vcardComponent)
      const subject = new ICAL.Property('anniversary', parent)
      subject.resetType('text')

      expect(subject.getDefaultType()).to.equal('date-and-or-time')
    })
  })

  describe('#getFirstValue', function () {
    it('with value', function () {
      const subject = new ICAL.Property('description')
      subject.setValue('foo')

      expect(subject.getFirstValue()).to.equal('foo')
    })

    it('without value', function () {
      const subject = new ICAL.Property('dtstart')
      expect(!subject.getFirstValue())
    })
  })

  describe('#getValues', function () {
    it('decorated', function () {
      const subject = new ICAL.Property(
        fixtures.decoratedMultiValue
      )

      const result = subject.getValues()
      expect(result).to.have.lengthOf(2)

      // 2012-10-10
      expect(result[0]).to.include({
        year: 2012,
        month: 10,
        day: 10,
        isDate: true
      })

      // 2012-10-11
      expect(result[1]).to.include({
        year: 2012,
        month: 10,
        day: 11,
        isDate: true
      })
    })

    it('undecorated', function () {
      const subject = new ICAL.Property(
        fixtures.mutliTextValue
      )

      const result = subject.getValues()
      expect(result).to.have.lengthOf(3)
      expect(result).to.deep.equal(
        ['one', 'two', 'three']
      )
    })

    it('single value', function () {
      const subject = new ICAL.Property(
        fixtures.textProp
      )
      expect(
        subject.getValues()).to.deep.equal(
        [subject.jCal[3]]
      )
    })

    it('no values', function () {
      const subject = new ICAL.Property(fixtures.noValue)
      expect(subject.getValues()).to.deep.equal([])
      expect(subject.toICALString()).to.equal('X-FOO;PROP=prop:')
    })

    it('foldable value', function () {
      const subject = new ICAL.Property(fixtures.textProp)
      expect(subject.getValues()).to.deep.equal(['foo'])
      expect(subject.toICALString()).to.equal('DESCRIPTION:foo')
      // Fold length should not fold the property here
      const oldLength = ICAL.foldLength
      ICAL['foldLength' + ''] = 1
      expect(subject.toICALString()).to.equal('DESCRIPTION:foo')
      ICAL['foldLength' + ''] = oldLength
    })
  })

  describe('#setValues', function () {
    it('decorated value', function () {
      const subject = new ICAL.Property('rdate')
      const undecorate = ICAL.design.icalendar.value['date-time'].undecorate

      const values = [
        new ICAL.Time({ year: 2012, month: 1 }),
        new ICAL.Time({ year: 2012, month: 1 })
      ]

      subject.setValues(values)

      expect(
        subject.jCal.slice(3)).to.deep.equal(
        [undecorate(values[0]), undecorate(values[1])]
      )

      expect(
        subject.getFirstValue()).to.equal(
        values[0]
      )
    })

    it('text', function () {
      const subject = new ICAL.Property('categories')

      subject.setValues(['a', 'b', 'c'])

      expect(
        subject.getValues()).to.deep.equal(
        ['a', 'b', 'c']
      )

      subject.setValues(['a'])
      expect(subject.getValues()).to.deep.equal(['a'])
    })
  })

  describe('#setValue', function () {

    it('decorated value as string', function () {
      const subject = new ICAL.Property(
        'dtstart'
      )

      subject.setValue('2012-09-01T13:00:00')
      const value = subject.getFirstValue()

      expect(subject.type).to.equal('date-time')
      expect(value).to.be.instanceOf(ICAL.Time)

      expect(value).to.include({
        year: 2012,
        month: 9,
        day: 1,
        hour: 13
      })
    })

    it('decorated value as object', function () {
      const subject = new ICAL.Property(
        'dtstart'
      )

      const time = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 5
      })

      subject.setValue(time)
      expect(subject.type).to.equal('date')

      expect(subject.jCal[3]).to.equal(
        ICAL.design.icalendar.value['date'].undecorate(time)
      )

      expect(subject.getFirstValue()).to.equal(time)
    })

    it('text', function () {
      const subject = new ICAL.Property('description')
      expect(!subject.getFirstValue())
      subject.setValue('xxx')
      expect(subject.getFirstValue()).to.equal('xxx')
    })

    it('multivalue property', function () {
      const subject = new ICAL.Property('categories')
      subject.setValues(['work', 'play'])
      subject.setValue('home')
      expect(subject.getValues()).to.deep.equal(['home'])
      expect(subject.getFirstValue()).to.equal('home')
    })

    it('single-value property setting multiple values', function () {
      const subject = new ICAL.Property('location')
      expect(() => subject.setValues(['foo', 'bar']))
        .to.throw('does not not support mulitValue')
    })
  })

  it('#toJSON', function () {
    const subject = new ICAL.Property(['description', {}, 'text', 'foo'])
    expect(subject.toJSON()).to.deep.equal(subject.jCal)
    const fromJSON = new ICAL.Property(JSON.parse(JSON.stringify(subject)))
    expect(fromJSON.jCal).to.deep.equal(subject.jCal)
  })
})
