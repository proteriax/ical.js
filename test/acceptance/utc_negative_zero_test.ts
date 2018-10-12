import * as ICAL from '../ical'
import { expect } from 'chai'
import { defineSample } from '../helper'
import { describe, it } from 'mocha'

describe('ics - negative zero', async () => {
  const icsData = await defineSample('utc_negative_zero.ics')

  it('summary', () => {
    const result = ICAL.parse(icsData)
    const component = new ICAL.Component(result)
    const vtimezone = component.getFirstSubcomponent('vtimezone')!
    const standard = vtimezone.getFirstSubcomponent('standard')!
    const props = standard.getAllProperties()
    const offset = props[1].getFirstValue()

    expect(offset.factor).to.equal(-1, 'offset')
  })
})
