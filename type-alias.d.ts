declare namespace ical {
  type Event = import('./lib/ical').Event
  type Component = import('./lib/ical').Component
  type ComponentParser = import('./lib/ical').ComponentParser
  type Duration = import('./lib/ical').Duration
  type Time = import('./lib/ical').Time
  type Timezone = import('./lib/ical').Timezone
  type RecurOptions = import('./lib/ical/recur').RecurOptions
  type RecurExpansion = import('./lib/ical').RecurExpansion
}

type FirstArg<F extends Function> =
  F extends (a: infer K) => any ? K :
  F extends new (a: infer K) => any ? K : never

type Arg<N extends number, F extends Function> =
  N extends 0 ? FirstArg<F> : never
