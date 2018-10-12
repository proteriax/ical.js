import * as ICAL from '../ical'

export function vcalComp() {
  return new ICAL.Component({
    type: 'COMPONENT',
    name: 'VCALENDAR'
  } as any)
}

export function veventComp() {
  return new ICAL.Component(vevent(propUUID()) as any)
}

export function vevent(props) {
  if (props == null) {
    props = []
  } else if (!Array.isArray(props)) {
    props = [props]
  }

  return {
    type: 'COMPONENT',
    name: 'VEVENT',
    value: props
  }
}

export function propUUID(uuid = 'uuid-value') {
  return {
    name: 'UID',
    value: [uuid],
    type: 'TEXT'
  }
}
