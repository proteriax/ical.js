import * as ICAL from '../../'
import { defineSample } from '../helper'
import { describe, it } from 'mocha'

describe('ics - blank description', async () => {
  const icsData = await defineSample('blank_description.ics')
  it('can parse blank lines', () => {
    ICAL.parse(icsData)
  })
})
