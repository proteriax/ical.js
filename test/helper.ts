import * as fs from 'fs-extra'
import { resolve } from 'path'
import { suiteTeardown } from 'mocha'

type ICAL = typeof import('./ical')

export async function defineSample(filename: string): Promise<string> {
  if (!filename || filename.includes('undefined')) {
    console.trace()
    throw new Error('No filename provided.')
  }

  return await fs.readFile(resolve(`./samples/${filename}`), 'utf8')
}

/**
 * Requires a benchmark build.
 *
 * @param version of the build (see build/benchmark/*)
 * @param optional callback called on completion
 */
export function requireBenchmarkBuild(version: string): ICAL {
  return require(`/build/benchmark/ical_${version}`)
}

const _timezones = Object.create(null)

/**
 * Registers a given timezone from samples with the timezone service.
 *
 * @param zone like "America/Los_Angeles".
 * @param callback fired when load/register is complete.
 */
export async function registerTimezone(ICAL: ICAL, zone: string) {
  const ics = _timezones[zone]

  function register(ics: string) {
    const parsed = ICAL.parse(ics)
    const calendar = new ICAL.Component(parsed)
    const vtimezone = calendar.getFirstSubcomponent('vtimezone')!
    const _zone = new ICAL.Timezone(vtimezone)
    ICAL.TimezoneService.register(vtimezone)
  }

  if (ics) {
    return register(ics)
  } else {
    const path = `samples/timezones/${zone}.ics`
    const data = await load(path)
    register(data)
    _timezones[zone] = data
    return register(data)
  }
}

/**
 * Registers a timezones for a given suite of tests.
 * Uses suiteSetup to stage and will use suiteTeardown
 * to purge all timezones for clean tests...
 *
 */
export function useTimezones(ICAL: ICAL, ...zones: string[]) {
  suiteTeardown(() => {
    // to ensure clean tests
    ICAL.TimezoneService.reset()
  })

  zones.forEach((zone) => {
    registerTimezone.call(zone)
  })
}

/**
 * @param path relative to root (/) of project.
 * @param callback [err, contents].
 */
export async function load(path: string) {
  const root = __dirname + '/../'
  return await fs.readFile(root + path, 'utf8')
}
