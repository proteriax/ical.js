import * as ICAL from '../ical.js'
import { expect } from 'chai'
import { defineSample } from '../helper'
import { describe, it } from 'mocha'

describe('ics test', async () => {
  const icsData = await defineSample('forced_types.ics')

  it('force type', function () {
    // just verify it can parse forced types
    const result = ICAL.parse(icsData)
    const component = new ICAL.Component(result)
    const vevent = component.getFirstSubcomponent('vevent')!

    const start = vevent.getFirstPropertyValue('dtstart')

    expect(start.isDate, 'is date type').to.be.true
  })
})
