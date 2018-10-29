import { getICAL } from '../ical'
import { defineSample } from '../helper'
import { describe, it } from 'mocha'

const ICAL = getICAL()

describe('ics - blank description', async () => {
  const icsData = await defineSample('blank_description.ics')
  it('can parse blank lines', () => {
    ICAL.parse(icsData)
  })
})
