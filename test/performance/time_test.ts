import { perfCompareSuite } from '../support/performance'

perfCompareSuite('ICAL.Time', (perf, ICAL) => {

  perf.test('subtract date', () => {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 1,
      hour: 10,
      minute: 3
    })

    const time2 = new ICAL.Time({
      year: 2012,
      month: 10,
      day: 1,
      hour: 1,
      minute: 55
    })

    time.subtractDate(time2)
  })

  const dur = new ICAL.Duration({
    days: 3,
    hours: 3,
    minutes: 3
  })

  perf.test('add duration', function () {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 32,
      second: 1,
    })

    time.addDuration(dur)

    // to trigger normalization
    time.year
  })

  perf.test('create and clone time', function () {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 32,
      second: 1,
    })

    if (time.day !== 1) {
      throw new Error('test sanity fails for .day')
    }

    if (time.month !== 2) {
      throw new Error('test sanity fails for .month')
    }

    time.clone()
  })

  const _time = new ICAL.Time({
    year: 2012,
    month: 1,
    day: 32,
    second: 1,
  })

  perf.test('toUnixTime', () => {
    _time.toUnixTime()
  })

  perf.test('dayOfWeek', () => {
    _time.dayOfWeek()
  })

  perf.test('weekNumber', () => {
    _time.weekNumber(ICAL.WeekDay.MONDAY)
  })

})
