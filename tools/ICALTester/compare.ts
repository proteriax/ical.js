#!/usr/local/bin/node -r ts-node/register
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2015 */

import fs from 'fs-extra'
import {spawn} from 'child_process'
import difflet from 'difflet'

const diff = difflet({ indent: true, comments: true })

import * as Tester from './lib/ICALTester'
import ICAL from '../..'

function setupHandlers(binPath: string) {
  Tester.addHandler('icaljs', (rule, dtstart, max, callback) => {
    const iter = rule.iterator(dtstart)
    let occ = 0
    const start = Date.now()

    const results: string[] = [];
    (function loop() {
      let next, diff

      if (++occ > max) {
        return callback(results)
      }

      try {
        next = iter.next()
      } catch (e) {
        return callback(e.message || e)
      }

      if (next) {
        results.push(next.toICALString())
      } else {
        return callback(results)
      }

      diff = (Date.now() - start) / 1000
      if (diff > Tester.MAX_EXECUTION_TIME) {
        return callback('Maximum execution time exceeded')
      }

      setImmediate(loop)
    })()
  })

  Tester.addHandler('other', (rule, dtstart, max, callback) => {
    const results: string[] = []
    let ptimer
    const recur = spawn(binPath, [rule.toString(), dtstart.toICALString(), max])

    recur.stdout.on('data', (data) => {
      results.push(...data.toString().split('\n').slice(0, -1))
    })

    recur.on('close', (code) => {
      if (ptimer) {
        clearTimeout(ptimer)
      }

      if (code === null) {
        callback('Maximum execution time exceeded')
      } else if (code !== 0) {
        callback('Execution error: ' + code)
      } else {
        callback(null, results)
      }
    })

    ptimer = setTimeout(() => {
      ptimer = null
      recur.kill()
    }, Tester.MAX_EXECUTION_TIME)
  })
}

function usage() {
  console.log('Usage: ICALTester rules.json /path/to/binary')
  process.exit(0)
}

async function main() {
  if (process.argv.length < 4) {
    usage()
  }

  const rulesFile = fs.statSync(process.argv[2]) && process.argv[2]
  const binPath = fs.statSync(process.argv[3]) && process.argv[3]
  const ruleData = JSON.parse(await fs.readFile(rulesFile, 'utf8'))

  const dtstart = ICAL.Time.fromString('2014-11-11T08:00:00')
  const max = 10

  setupHandlers(binPath)

  Tester.run(ruleData, dtstart, max, (_err, results) => {
    console.log(diff.compare(results.other, results.icaljs))
  })
}

main().catch(console.error)
