import * as _ from 'lodash'
import * as fs from 'fs-extra'
import { resolve } from 'path'

type ICAL = ReturnType<typeof import('./ical').getICAL>

export const defineSample = (filename: string): Promise<string> => {
  if (!filename || filename.includes('undefined')) {
    console.trace()
    throw new Error('No filename provided.')
  }
  return fs.readFile(resolve(`./samples/${filename}`), 'utf8')
}

export function spy<T, K extends keyof T>(obj: T, name: K, callback: T[K]) {
  const fn: any = obj[name]
  obj[name] = <any> function () {
    (callback as any).apply(this, arguments)
    return fn.apply(this, arguments)
  }
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
  if (!zone) {
    throw new TypeError('Unexpected empty zone.')
  }

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
  zones.forEach((zone) => {
    registerTimezone(ICAL, zone)
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
