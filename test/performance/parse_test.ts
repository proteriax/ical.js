import { defineSample } from '../helper'
import { perfCompareSuite } from '../support/performance'

perfCompareSuite('ICAL parse/stringify', async (perf, ICAL) => {
  const icsData = await defineSample('parserv2.ics')
  const parsed = ICAL.parse(icsData)

  perf.test('#parse', () => {
    ICAL.parse(icsData)
  })
  perf.test('#stringify', () => {
    ICAL.stringify(parsed)
  })
})
