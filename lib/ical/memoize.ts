const identity = <T>(v: T) => v
const constant = <T>(v: T) => () => v

export function memoize(_, key: PropertyKey, desc: PropertyDescriptor) {
  const { get, value } = desc
  const createCallback = (func: Function, toPropVal: (old: any) => any) => function () {
    const value = func.call(this)
    Object.defineProperty(this, key, {
      value: toPropVal(value),
      enumerable: desc.enumerable,
      configurable: desc.configurable,
    })
    return value
  }

  if (get) {
    desc.get = createCallback(get, identity)
  } else if (typeof value === 'function') {
    desc.value = createCallback(value, constant)
  } else {
    throw new TypeError(
      'Cannot memoize a property that has neither getter or value function.'
    )
  }
}
