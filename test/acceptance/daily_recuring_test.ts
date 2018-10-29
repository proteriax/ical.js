import { getICAL } from '../ical'
import { defineSample } from '../helper'
import { describe, it } from 'mocha'

const ICAL = getICAL()

describe('ics - blank description', async function () {
  const icsData = await defineSample('daily_recur.ics')

  it('summary', function () {
    // just verify it can parse blank lines
    const result = ICAL.parse(icsData)
    const component = new ICAL.Component(result)
    const vevent = component.getFirstSubcomponent('vevent')!
    const recur = vevent.getFirstPropertyValue('rrule')
    const start = vevent.getFirstPropertyValue('dtstart')

    const iter = recur.iterator(start)
    let limit = 10
    while (limit) {
      iter.next()
      limit--
    }
  })
})
