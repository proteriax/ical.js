/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
* Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { Timezone } from './Timezone'
import { Component } from './Component'

const zones = new Map<string, Timezone>()

export function reset() {
  const utc = Timezone.utcTimezone
  zones.clear()
  zones.set('Z', utc)
  zones.set('UTC', utc)
  zones.set('GMT', utc)
}

/**
 * Checks if timezone id has been registered.
 *
 * @param tzid     Timezone identifier (e.g. America/Los_Angeles)
 * @return False, when not present
 */
export function has(tzid: string): boolean {
  return zones.has(tzid)
}

/**
 * Returns a timezone by its tzid if present.
 *
 * @param tzid Timezone identifier (e.g. America/Los_Angeles)
 * @return The timezone, or null if not found
 */
export function get(tzid: string) {
  return zones.get(tzid)
}

export function register(component: Component): void
export function register(name: string | undefined, timezone: Timezone): void

/**
 * Registers a timezone object or component.
 *
 * @param name
 *        The name of the timezone. Defaults to the component's TZID if not
 *        passed.
 * @param zone
 *        The initialized zone or vtimezone.
 */
export function register(name, timezone?: Timezone) {
  if (name != null && name instanceof Component) {
    if (name.name === 'vtimezone') {
      timezone = new Timezone(name)
      name = timezone.tzid
    }
  }

  if (timezone instanceof Timezone) {
    zones.set(name, timezone)
  } else {
    throw new TypeError('timezone must be Timezone or Component, got ' + typeof timezone)
  }
}

/**
 * Removes a timezone by its tzid from the list.
 *
 * @param tzid     Timezone identifier (e.g. America/Los_Angeles)
 */
export function remove(tzid: string) {
  zones.delete(tzid)
}

