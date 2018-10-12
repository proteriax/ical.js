import { defineSample } from '../helper'
import { perfCompareSuite } from '../support/performance'

perfCompareSuite('iterator', async (perf, ICAL) => {
  const icsData = await defineSample('parserv2.ics')

  const parsed = ICAL.parse(icsData)
  const comp = new ICAL.Component(parsed)
  const tz = comp.getFirstSubcomponent('vtimezone')!
  const std = tz.getFirstSubcomponent('standard')!
  const rrule = std.getFirstPropertyValue('rrule')

  perf.test('timezone iterator & first iteration', () => {
    const iterator = rrule.iterator(std.getFirstPropertyValue('dtstart'))
    iterator.next()
  })
})
