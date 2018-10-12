import * as ICAL from '../ical'
import { describe, it } from 'mocha'
import { Suite } from 'benchmark'
import { requireBenchmarkBuild } from '../helper'

/**
 * Define a performance suite...
 */

const VERSIONS = ['latest', 'previous', 'upstream']

type Scope = (context: Context, ical: typeof ICAL) => void

class Context {
  bench: Suite
  prefix = ''
  icalVersion = 'latest'
  icalObject: any

  constructor(bench: Suite, options?) {
    this.bench = bench

    if (options) {
      for (const key in options) {
        this[key] = options[key]
      }
    }
  }

  async loadICAL() {
    if (this.icalObject) {
      return this.icalObject
    } else if (this.icalVersion) {
      if (this.icalVersion === 'latest') {
        this.icalObject = ICAL
        return this.icalObject
      } else {
        try {
          const lib = await requireBenchmarkBuild(this.icalVersion)
          this.icalObject = lib
          if (!this.icalObject) {
            console.log(`Version ICAL_${this.icalVersion} not found, skipping`)
          }
          return this.icalObject
        } catch (e) {
          console.log(`Version ICAL_${this.icalVersion} not found, skipping`)
          this.icalObject = null
          return null
        }
      }
    }
  }

  test(name: string, test: () => void) {
    this.bench.add(this.prefix + name, test)
  }

  compare(suite: (context: Context, ical: typeof ICAL) => void) {
    VERSIONS.forEach(async (versionName) => {
      const context = new Context(this.bench, {
        icalVersion: versionName,
        prefix: versionName + ': '
      })

      const ICAL = await context.loadICAL()
      if (ICAL) {
        suite(context, ICAL)
      }
    }, this)
  }
}

export function perfSuite(name: string, scope: (context: Context) => void) {
  const bench = new Suite()
  const context = new Context(bench)

  /**
   * This is somewhat lame because it requires you to manually
   * check the results (visually via console output) to actually
   * see what the performance results are...
   *
   * The intent is to define a nicer API while using our existing tools.
   * Later we will improve on the tooling to make this a bit more automatic.
   */
  describe(name, () => {
    scope(context)

    it('benchmark', function (done) {
      this.timeout(0)
      // quick formatting hack
      console.log()

      bench.on('cycle', function (event) {
        console.log(String(event.target))
      })

      bench.on('complete', function () {
        done()
      })

      bench.run()
    })
  })
}

export function perfCompareSuite(name: string, scope: Scope) {
  perfSuite(name, (perf) => {
    perf.compare(scope)
  })
}
