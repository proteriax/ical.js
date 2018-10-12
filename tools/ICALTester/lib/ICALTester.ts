/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2015 */


/**
 * ICALTester Module
 * @module ICALTester
 */

import * as _ from 'lodash'
import ICAL from '../../..'
import async from 'async'

function range(min: number, max: number, nozero?: boolean) {
  const res: number[] = []
  for (let i = min; i <= max; i++) {
    if (i === 0 && nozero) {
      continue
    }
    res.push(i)
  }
  return res
}

function withempty(res, empty = '') {
  return [empty].concat(res)
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * max) + min
}

function randList<T = any>(list: T[], count: number) {
  const vals = list.slice()
  const res: T[] = []

  while (count--) {
    res.push(vals.splice(randInt(0, vals.length), 1)[0])
  }
  return res
}

function randValues(designdata) {
  const count = randInt(1, designdata.length)
  return randList(designdata, count)
}

function sortByday(aRules, aWeekStart) {
  const thisobj = {
    ruleDayOfWeek: ICAL.RecurIterator.prototype.ruleDayOfWeek,
    sort_byday_rules: ICAL.RecurIterator.prototype.sort_byday_rules
  }

  return thisobj.sort_byday_rules(aRules, aWeekStart || ICAL.Time.MONDAY)
}

function sortNumeric(a: number, b: number) {
  return a - b
}

function substitute(rules) {
  return rules.map((r) => {
    for (const key in r) {
      if (r[key] === '%') {
        r[key] = generators[key](r)
      }
    }
    return ICAL.Recur.fromData(r)
  })
}

type Handler = (rule, dtstart: ical.Time, max: number, callback) => void

export function addHandler(name: string, callback: Handler) {
  asyncHandler[name] = callback
}

const runHandler = (handler: Handler, rules, dtstart, max) => (callback) => {
  const res = {}
  async.eachLimit(rules, CONCURRENCY, (rule: any, eachcb) => {
    handler(rule, dtstart, max, (err, result) => {
      res[rule] = err || result
      eachcb()
    })
  }, function (err) {
    callback(null, res)
  })
}

export function run(ruleData, dtstart, max, callback) {
  const rules = substitute(ruleData)
  const boundAsyncHandler = _.mapValues(asyncHandler, (handler) =>
    runHandler(handler, rules, dtstart, max))
  async.parallel(boundAsyncHandler, callback)
}

export const CONCURRENCY = 2
export const MAX_EXECUTION_TIME = 1000
const asyncHandler: { [key: string]: Handler } = {}

const day_names = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const freq_values = ['SECONDLY', 'MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
const design = {
  FREQ: freq_values,

  BYSECOND: range(0, 60),
  BYMINUTE: range(0, 59),
  BYHOUR: range(0, 23),

  BYDAY: {
    DAILY: [withempty(range(-5, 5, true)), day_names],
    WEEKLY: [withempty(range(-5, 5, true)), day_names],
    MONTHLY: [withempty(range(-5, 5, true)), day_names],
    YEARLY: [withempty(range(-53, 53, true)), day_names]
  },
  BYMONTHDAY: range(1, 31), /// TOOO -31
  BYYEARDAY: range(-366, 366),

  BYWEEKNO: range(-53, 53),
  BYMONTH: range(1, 12),
  BYSETPOS: range(-366, 366),
  WKST: day_names
}

export const generators = {
  byday(rule) {
    const designdata = design.BYDAY[rule.freq]

    const daycount = randInt(1, designdata[1].length)
    const days = randList(designdata[1], daycount)
    const prefix = randList(designdata[0], daycount)

    sortByday(days, rule.wkst)

    return days.map((day, i) => prefix[i] + day)
  },
  bymonthday() {
    return randValues(design.BYMONTHDAY).sort(sortNumeric)
  },
  bymonth() {
    return randValues(design.BYMONTH).sort(sortNumeric)
  }
}
