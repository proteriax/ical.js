import * as ICAL from './ical'
import { expect } from 'chai'
import { describe, setup, it } from 'mocha'

describe('Component', function () {
  const fixtures = {
    components: [
      'vevent',
      [
        ['description', {}, 'text', 'xfoo'],
        ['description', {}, 'text', 'xfoo2'],
        ['xfoo', {}, 'text', 'xfoo3']
      ],
      [
        ['valarm', [], []],
        ['vtodo', [], []],
        ['valarm', [['description', {}, 'text', 'foo']], []]
      ]
    ] as any[]
  }
  let subject = new ICAL.Component(fixtures.components)

  describe('initialization', function () {
    it('initialize component', function () {
      const raw = ['description', {}, 'text', 'value']
      subject = new ICAL.Component(raw)

      expect(subject.jCal).to.equal(raw, 'has jCal')
      expect(subject.name).to.equal('description')
    })

    it('new component without jCal', function () {
      const newComp = new ICAL.Component('vevent')

      expect(newComp.jCal[0]).to.equal('vevent')

      expect(newComp.getAllSubcomponents()).to.be.empty
      expect(newComp.getAllProperties()).to.be.empty
    })

    it('#fromString', function () {
      const comp = ICAL.Component.fromString('BEGIN:VCALENDAR\nX-CALPROP:value\nEND:VCALENDAR')
      expect(comp.name).to.equal('vcalendar')
      const prop = comp.getFirstProperty()!
      expect(prop.name).to.equal('x-calprop')
      expect(prop.getFirstValue()).to.equal('value')
    })
  })

  describe('parenting', function () {
    // Today we hear a tale about Tom, Marge, Bernhard and Claire.
    const tom = new ICAL.Component('tom')
    const bernhard = new ICAL.Component('bernhard')
    const claire = new ICAL.Component('claire')
    const marge = new ICAL.Component('marge')
    const relationship = new ICAL.Component('vrelationship')
    const house = new ICAL.Property('house')
    const otherhouse = new ICAL.Property('otherhouse')

    it('does the basic', function () {
      // Tom and Bernhard are best friends. They are happy and single.
      expect(tom.parent).to.be.null
      expect(bernhard.parent).to.be.null

      // One day, they get to know Marge, who is also single.
      expect(marge.parent).to.be.null

      // Tom and Bernhard play rock paper scissors on who gets a first shot at
      // Marge and Tom wins. After a few nice dates they get together.
      relationship.addSubcomponent(tom)
      relationship.addSubcomponent(marge)

      // Both are happy as can be and tell everyone about their love. Nothing
      // goes above their relationship!
      expect(relationship.parent).to.be.null
      expect(tom.parent).to.equal(relationship)
      expect(marge.parent).to.equal(relationship)

      // Over the years, there are a few ups and downs.
      relationship.removeSubcomponent(tom)
      expect(relationship.parent).to.be.null
      expect(tom.parent).to.be.null
      expect(marge.parent).to.equal(relationship)
      relationship.removeAllSubcomponents()
      expect(marge.parent).to.be.null

      // But in the end they stay together.
      relationship.addSubcomponent(tom)
      relationship.addSubcomponent(marge)
    })

    it('accepts multiple children', function () {
      // After some happy years Tom and Marge get married. Tom is going to be father
      // of his beautiful daughter Claire.
      tom.addSubcomponent(claire)

      // He has no doubt he is the father
      expect(claire.parent).to.equal(tom)

      // One day, Tom catches his wife in bed with his best friend Bernhard.
      // Tom is very unhappy and requests a paternity test. It turns out that
      // Claire is actually Bernhard's daughter.
      bernhard.addSubcomponent(claire)

      // Bernhard is happy to hear about his daughter, while Tom goes about to
      // tell everyone he knows. Claire is devastated and would have rather
      // found out about this.
      expect(tom.removeSubcomponent(claire)).to.be.false

      // Marge knew it all along. What a sad day. Claire is not Tom's daughter,
      // but instead Bernhard's. Tom has no children, and Bernhard is the happy
      // father of his daughter claire.
      expect(claire.parent).to.equal(bernhard)
      expect(tom.getFirstSubcomponent()).to.not.exist
      expect(bernhard.getFirstSubcomponent()).to.equal(claire)

      // Feeling depressed, Tom tries to find happyness with a pet, but all he
      // got was scratches and sadness. That didn't go so well.
      expect(() => tom.addProperty(<any>'bird')).to.throw('must instance of ICAL.Property')
    })

    it('properties', function () {
      // Marge lives on a property near the Hamptons, she thinks it belongs to
      // her.
      marge.addProperty(house)
      expect(house.parent).to.equal(marge)

      // It seems that Tom didn't always trust Marge, he had fooled her. The
      // house belongs to him.
      tom.addProperty(house)
      expect(house.parent).to.equal(tom)
      expect(marge.getFirstProperty()).to.not.exist

      // Bernhard being an aggressive character, tries to throw Tom out of his
      // own house. A long visit in the hospital lets neighbors believe noone
      // lives there anymore.
      tom.removeProperty(house)
      expect(house.parent).to.be.null

      // Marge spends a few nights there, but also lives in her other house.
      marge.addProperty(house)
      marge.addProperty(otherhouse)
      expect(house.parent).to.equal(marge)
      expect(otherhouse.parent).to.equal(marge)

      // Tom is back from the hospital and very mad. He throws marge out of his
      // house. Unfortunately marge can no longer pay the rent for her other
      // house either.
      marge.removeAllProperties()
      expect(house.parent).to.be.null
      expect(otherhouse.parent).to.be.null

      // What a mess. What do we learn from this testsuite? Infidelity is not a
      // good idea. Always be faithful!
    })
  })

  describe('#getFirstSubcomponent', function () {
    const jCal = fixtures.components
    subject = new ICAL.Component(jCal)

    it('without name', function () {
      const component = subject.getFirstSubcomponent()!
      expect(component.parent).to.equal(subject)
      expect(component.name).to.equal('valarm')

      // first sub component
      const expected = jCal[2][0]
      expect(component.jCal).to.equal(expected)
    })

    it('with name (when not first)', function () {
      const component = subject.getFirstSubcomponent('vtodo')!
      expect(component.parent).to.equal(subject)
      expect(component.name).to.equal('vtodo')
      expect(component.jCal).to.equal(jCal[2][1])
    })

    it('with name (when there are two)', function () {
      const component = subject.getFirstSubcomponent('valarm')!
      expect(component.name).to.equal('valarm')
      expect(component.jCal).to.equal(jCal[2][0])
    })

    it('equality between calls', function () {
      expect(subject.getFirstSubcomponent())
        .to.equal(subject.getFirstSubcomponent())
    })
  })

  describe('#getAllSubcomponents', function () {
    it('with components', function () {
      // 2 is the component array
      const comps = fixtures.components[2]

      subject = new ICAL.Component(
        fixtures.components
      )

      const result = subject.getAllSubcomponents()
      expect(result).to.have.lengthOf(comps.length)

      for (let i = 0; i < comps.length; i++) {
        expect(result[i]).to.be.instanceOf(ICAL.Component)
        expect(result[i].jCal).to.equal(comps[i])
      }
    })

    it('with name', function () {
      subject = new ICAL.Component(fixtures.components)

      const result = subject.getAllSubcomponents('valarm')
      expect(result).to.have.lengthOf(2)

      result.forEach(function (item) {
        expect(item.name).to.equal('valarm')
      })
    })

    it('without components', function () {
      subject = new ICAL.Component(['foo', [], []])
      expect(subject.name).to.equal('foo')
      expect(subject.getAllSubcomponents()).to.be.empty
    })

    it('with name from end', function () {
      // We need our own subject for this test
      const oursubject = new ICAL.Component(fixtures.components)

      // Get one from the end first
      const comps = fixtures.components[2]
      oursubject.getAllSubcomponents(comps[comps.length - 1][0])

      // Now get them all, they MUST be hydrated
      const results = oursubject.getAllSubcomponents()
      for (let i = 0; i < results.length; i++) {
        expect(results[i]).to.not.be.null
        expect(results[i].jCal).to.equal(subject.jCal[2][i])
      }
    })
  })

  it('#addSubcomponent', function () {
    const newComp = new ICAL.Component('xnew')

    subject.addSubcomponent(newComp)
    const all = subject.getAllSubcomponents()

    expect(all[all.length - 1]).to.equal(newComp, 'can reference component')
    expect(all.length).to.equal(subject.jCal[2].length, 'has same number of items')
    expect(subject.jCal[2][all.length - 1]).to.equal(newComp.jCal, 'adds jCal')
  })

  describe('#removeSubcomponent', function () {
    it('by name', function () {
      subject.removeSubcomponent('vtodo')

      const all = subject.getAllSubcomponents()

      all.forEach(function (item) {
        expect(item.name).to.equal('valarm')
      })
    })

    it('by component', function () {
      const first = subject.getFirstSubcomponent()!
      subject.removeSubcomponent(first)
      expect(subject.getFirstSubcomponent()).to.not.equal(first)
      expect(subject.getFirstSubcomponent()!.name).to.equal('vtodo')
    })

    it('remove non hydrated subcomponent should not shift hydrated property', function () {
      const component = new ICAL.Component([
        'vevent',
        [],
        [
          ['a', [], []],
          ['b', [], []],
          ['c', [], []]
        ]
      ])
      component.getFirstSubcomponent('b')
      component.removeSubcomponent('a')
      const cValue = component.getFirstSubcomponent('c')!.name
      expect(cValue).to.equal('c')
    })
  })

  describe('#removeAllSubcomponents', function () {
    it('with name', function () {
      subject.removeAllSubcomponents('valarm')
      expect(subject.jCal[2]).to.have.lengthOf(1)
      expect(subject.jCal[2][0][0]).to.equal('vtodo')
      expect(subject.getAllSubcomponents()).to.have.lengthOf(1)
    })

    it('all', function () {
      subject.removeAllSubcomponents()
      expect(subject.jCal[2]).to.be.empty
      expect(subject.getAllSubcomponents()).to.be.empty
    })
  })

  it('#hasProperty', function () {
    subject = new ICAL.Component(
      fixtures.components
    )

    expect(subject.hasProperty('description'))
    expect(!subject.hasProperty('iknowitsnothere'))
  })

  describe('#getFirstProperty', function () {
    const subject = new ICAL.Component(fixtures.components)

    it('name missing', function () {
      expect(!subject.getFirstProperty('x-foo'))
    })

    it('name has multiple', function () {
      const first = subject.getFirstProperty('description')!
      expect(first).to.equal(subject.getFirstProperty())
      expect(first.getFirstValue()).to.equal('xfoo')
    })

    it('without name', function () {
      const first = subject.getFirstProperty()!
      expect(first.jCal).to.equal(fixtures.components[1][0])
    })

    it('without name empty', function () {
      const subject = new ICAL.Component(['foo', [], []])
      expect(!subject.getFirstProperty())
    })
  })

  it('#getFirstPropertyValue', function () {
    const subject = new ICAL.Component(fixtures.components)!
    expect(subject.getFirstPropertyValue()).to.equal('xfoo')
  })

  describe('#getAllProperties', function () {
    const subject = new ICAL.Component(fixtures.components)

    it('with name', function () {
      const results = subject.getAllProperties('description')
      expect(results).to.have.lengthOf(2)

      results.forEach(function (item, i) {
        expect(item.jCal).to.equal(subject.jCal[1][i])
      })
    })

    it('with name empty', function () {
      const results = subject.getAllProperties('wtfmissing')
      expect(results).to.be.empty
    })

    it('without name', function () {
      const results = subject.getAllProperties()
      results.forEach(function (item, i) {
        expect(item.jCal).to.equal(subject.jCal[1][i])
      })
    })

    it('with name from end', function () {
      // We need our own subject for this test
      const oursubject = new ICAL.Component(fixtures.components)

      // Get one from the end first
      const props = fixtures.components[1]
      oursubject.getAllProperties(props[props.length - 1][0])

      // Now get them all, they MUST be hydrated
      const results = oursubject.getAllProperties()
      for (let i = 0; i < results.length; i++) {
        expect(results[i]).to.not.be.null
        expect(results[i].jCal).to.equal(subject.jCal[1][i])
      }
    })
  })

  it('#addProperty', function () {
    const prop = new ICAL.Property('description')

    subject.addProperty(prop)
    expect(subject.jCal[1][3]).to.equal(prop.jCal)

    const all = subject.getAllProperties()
    const lastProp = all[all.length - 1]

    expect(lastProp).to.equal(prop)
    expect(lastProp.parent).to.equal(subject)
  })

  it('#addPropertyWithValue', function () {
    const subject = new ICAL.Component('vevent')

    subject.addPropertyWithValue('description', 'value')

    const all = subject.getAllProperties()

    expect(all[0].name).to.equal('description')
    expect(all[0].getFirstValue()).to.equal('value')
  })

  it('#updatePropertyWithValue', function () {
    const subject = new ICAL.Component('vevent')
    subject.addPropertyWithValue('description', 'foo')
    expect(subject.getAllProperties()).to.have.lengthOf(1)

    subject.updatePropertyWithValue('description', 'xxx')

    expect(subject.getFirstPropertyValue('description'), 'xxx')
    subject.updatePropertyWithValue('x-foo', 'bar')

    subject.getAllProperties()
    expect(subject.getFirstPropertyValue('x-foo'), 'bar')
  })

  describe('#removeProperty', () => {
    const subject = new ICAL.Component(fixtures.components)

    it('try to remove non-existent', () => {
      const result = subject.removeProperty('wtfbbq')
      expect(result).to.be.false
    })

    it('remove by property', () => {
      const first = subject.getFirstProperty('description')!
      const result = subject.removeProperty(first)
      expect(result, 'removes property').to.be.true
      expect(subject.getFirstProperty('description')).to.not.equal(first)
      expect(subject.jCal[1]).to.have.lengthOf(2)
    })

    it('remove by name', () => {
      // there are two descriptions
      const list = subject.getAllProperties()
      const first = subject.getFirstProperty('description')

      const result = subject.removeProperty('description')
      expect(result).to.be.true
      expect(subject.getFirstProperty('description')).to.not.equal(first)
      expect(list).to.have.lengthOf(2)
    })

    it('remove non hydrated property should not shift hydrated property', () => {
      const component = new ICAL.Component(['vevent', [
        ['a', {}, 'text', 'a'],
        ['b', {}, 'text', 'b'],
        ['c', {}, 'text', 'c']
      ]])
      component.getFirstPropertyValue('b')
      component.removeProperty('a')
      const cValue = component.getFirstPropertyValue('c')
      expect(cValue).to.equal('c')
    })
  })

  describe('#removeAllProperties', () => {
    it('no name when empty', () => {
      const subject = new ICAL.Component(fixtures.components)
      expect(subject.jCal[1]).to.have.lengthOf(3)
      subject.removeAllProperties()

      expect(subject.jCal[1]).to.be.empty
      expect(!subject.getFirstProperty())
    })

    it('no name when not empty', function () {
      subject = new ICAL.Component(['vevent', [], []])
      subject.removeAllProperties()
      subject.removeAllProperties('xfoo')
    })

    it('with name', function () {
      const subject = new ICAL.Component(fixtures.components)

      subject.removeAllProperties('description')
      expect(subject.jCal[1]).to.have.lengthOf(1)

      const first = subject.getFirstProperty()!

      expect(first.name).to.equal('xfoo')
      expect(subject.jCal[1][0][0]).to.equal('xfoo')
    })
  })

  it('#toJSON', function () {
    const json = JSON.stringify(subject)
    const fromJSON = new ICAL.Component(JSON.parse(json))

    expect(fromJSON.jCal).to.deep.equal(subject.jCal)
  })

  it('#toString', function () {
    const ical = subject.toString()
    const parsed = ICAL.parse(ical)
    const fromICAL = new ICAL.Component(parsed)

    expect(subject.jCal).to.deep.equal(fromICAL.jCal)
  })

})
