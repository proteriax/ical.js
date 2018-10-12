declare namespace ical {
  type Event = import('./lib/ical').Event
  type Component = import('./lib/ical').Component
  type ComponentParser = import('./lib/ical').ComponentParser
  type Duration = import('./lib/ical').Duration
  type Time = import('./lib/ical').Time
  type Timezone = import('./lib/ical').Timezone
  type RecurOptions = import('./lib/ical/recur').RecurOptions
}
