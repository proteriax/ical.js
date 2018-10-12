/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { Property } from './Property'
import { design } from './design'
import { stringify } from './stringify'
import { parse } from './parse'

const PROPERTY_INDEX = 1
const COMPONENT_INDEX = 2
const NAME_INDEX = 0

/**
 * Wraps a jCal component, adding convenience methods to add,
 * remove and update subcomponents and properties.
 */
export class Component {
  jCal: { [key: string]: any }
  parent
  _components: Component[]
  _properties: Property[]

  /**
   * @param jCal Raw jCal component data OR name of new component
   * @param parent Parent component to associate
   */
  constructor(jCal: any[] | string, parent?: Component) {
    if (typeof(jCal) === 'string') {
      // jCal spec (name, properties, components)
      jCal = [jCal, [], []]
    }

    // mostly for legacy reasons.
    this.jCal = jCal

    this.parent = parent || null
  }

  /**
   * Hydrated properties are inserted into the _properties array at the same
   * position as in the jCal array, so its possible the array contains
   * undefined values for unhydrdated properties. To avoid iterating the
   * array when checking if all properties have been hydrated, we save the
   * count here.
   *
   * @private
   */
  private _hydratedPropertyCount: number = 0

  /**
   * The same count as for _hydratedPropertyCount, but for subcomponents
   *
   * @private
   */
  private _hydratedComponentCount: number = 0

  /**
   * The name of this component
   * @readonly
   */
  get name() {
    return this.jCal[NAME_INDEX]
  }

  /**
   * The design set for this component, e.g. icalendar vs vcard
   *
   * @type {ICAL.design.designSet}
   * @private
   */
  get _designSet() {
    const parentDesign = this.parent && this.parent._designSet
    return parentDesign || design.getDesignSet(this.name)
  }

  _hydrateComponent(index: number) {
    if (!this._components) {
      this._components = []
      this._hydratedComponentCount = 0
    }

    if (this._components[index]) {
      return this._components[index]
    }

    const comp = new Component(
      this.jCal[COMPONENT_INDEX][index],
      this
    )

    this._hydratedComponentCount++
    return (this._components[index] = comp)
  }

  _hydrateProperty(index) {
    if (!this._properties) {
      this._properties = []
      this._hydratedPropertyCount = 0
    }

    if (this._properties[index]) {
      return this._properties[index]
    }

    const prop = new Property(
      this.jCal[PROPERTY_INDEX][index],
      this
    )

    this._hydratedPropertyCount++
    return (this._properties[index] = prop)
  }

  /**
   * Finds first sub component, optionally filtered by name.
   *
   * @param name        Optional name to filter by
   * @return The found subcomponent
   */
  getFirstSubcomponent(name?: string): Component | undefined {
    if (name) {
      let i = 0
      const comps = this.jCal[COMPONENT_INDEX]
      const len = comps.length

      for (; i < len; i++) {
        if (comps[i][NAME_INDEX] === name) {
          const result = this._hydrateComponent(i)
          return result
        }
      }
    } else {
      if (this.jCal[COMPONENT_INDEX].length) {
        return this._hydrateComponent(0)
      }
    }
  }

  /**
   * Finds all sub components, optionally filtering by name.
   *
   * @param {String=} name            Optional name to filter by
   * @return {Component[]}       The found sub components
   */
  getAllSubcomponents(name?: string): Component[] {
    const jCalLen = this.jCal[COMPONENT_INDEX].length
    let i = 0

    if (name) {
      const comps = this.jCal[COMPONENT_INDEX]
      const result: Component[] = []

      for (; i < jCalLen; i++) {
        if (name === comps[i][NAME_INDEX]) {
          result.push(
            this._hydrateComponent(i)
          )
        }
      }
      return result
    } else {
      if (!this._components ||
          (this._hydratedComponentCount !== jCalLen)) {
        for (; i < jCalLen; i++) {
          this._hydrateComponent(i)
        }
      }

      return this._components || []
    }
  }

  /**
   * Returns true when a named property exists.
   *
   * @param name     The property name
   * @return        True, when property is found
   */
  hasProperty(name: string): boolean {
    const props = this.jCal[PROPERTY_INDEX]
    const len = props.length

    let i = 0
    for (; i < len; i++) {
      // 0 is property name
      if (props[i][NAME_INDEX] === name) {
        return true
      }
    }

    return false
  }

  /**
   * Finds the first property, optionally with the given name.
   *
   * @param name Lowercase property name
   * @return The found property
   */
  getFirstProperty(name?: string): undefined | Property {
    if (name) {
      let i = 0
      const props = this.jCal[PROPERTY_INDEX]
      const len = props.length

      for (; i < len; i++) {
        if (props[i][NAME_INDEX] === name) {
          const result = this._hydrateProperty(i)
          return result
        }
      }
    } else {
      if (this.jCal[PROPERTY_INDEX].length) {
        return this._hydrateProperty(0)
      }
    }
  }

  /**
   * Returns first property's value, if available.
   *
   * @param {String=} name    Lowercase property name
   * @return {?String}        The found property value.
   */
  getFirstPropertyValue(name?: string) {
    const prop = this.getFirstProperty(name)
    if (prop) {
      return prop.getFirstValue()
    }
    return null
  }

  /**
   * Get all properties in the component, optionally filtered by name.
   *
   * @param {String=} name        Lowercase property name
   * @return {ICAL.Property[]}    List of properties
   */
  getAllProperties(name?: string): Property[] {
    const jCalLen = this.jCal[PROPERTY_INDEX].length
    let i = 0

    if (name) {
      const props = this.jCal[PROPERTY_INDEX]
      const result: Property[] = []

      for (; i < jCalLen; i++) {
        if (name === props[i][NAME_INDEX]) {
          result.push(
            this._hydrateProperty(i)
          )
        }
      }
      return result
    } else {
      if (!this._properties ||
          (this._hydratedPropertyCount !== jCalLen)) {
        for (; i < jCalLen; i++) {
          this._hydrateProperty(i)
        }
      }

      return this._properties || []
    }
  }

  _removeObjectByIndex(jCalIndex, cache: object[] = [], index) {
    // remove cached version
    if (cache[index]) {
      const obj = cache[index]
      if ('parent' in obj) {
        obj['parent'] = null
      }
    }

    cache.splice(index, 1)

    // remove it from the jCal
    this.jCal[jCalIndex].splice(index, 1)
  }

  _removeObject(jCalIndex, cache, nameOrObject) {
    let i = 0
    const objects = this.jCal[jCalIndex]
    const len = objects.length
    const cached = this[cache]

    if (typeof(nameOrObject) === 'string') {
      for (; i < len; i++) {
        if (objects[i][NAME_INDEX] === nameOrObject) {
          this._removeObjectByIndex(jCalIndex, cached, i)
          return true
        }
      }
    } else if (cached) {
      for (; i < len; i++) {
        if (cached[i] && cached[i] === nameOrObject) {
          this._removeObjectByIndex(jCalIndex, cached, i)
          return true
        }
      }
    }

    return false
  }

  _removeAllObjects(jCalIndex, cache, name) {
    const cached = this[cache]

    // Unfortunately we have to run through all children to reset their
    // parent property.
    const objects = this.jCal[jCalIndex]
    let i = objects.length - 1
    let removed = false

    // descending search required because splice
    // is used and will effect the indices.
    for (; i >= 0; i--) {
      if (!name || objects[i][NAME_INDEX] === name) {
        this._removeObjectByIndex(jCalIndex, cached, i)
        removed = true
      }
    }
    return removed
  }

  /**
   * Adds a single sub component.
   *
   * @param component        The component to add
   * @return The passed in component
   */
  addSubcomponent(component: Component): Component {
    if (!this._components) {
      this._components = []
      this._hydratedComponentCount = 0
    }

    if (component.parent) {
      component.parent.removeSubcomponent(component)
    }

    const idx = this.jCal[COMPONENT_INDEX].push(component.jCal)
    this._components[idx - 1] = component
    this._hydratedComponentCount++
    component.parent = this
    return component
  }

  /**
   * Removes a single component by name or the instance of a specific
   * component.
   *
   * @param nameOrComp    Name of component, or component
   * @return True when comp is removed
   */
  removeSubcomponent(nameOrComp: Component | string): boolean {
    const removed = this._removeObject(COMPONENT_INDEX, '_components', nameOrComp)
    if (removed) {
      this._hydratedComponentCount--
    }
    return removed
  }

  /**
   * Removes all components or (if given) all components by a particular
   * name.
   *
   * @param {String=} name            Lowercase component name
   */
  removeAllSubcomponents(name?: string) {
    const removed = this._removeAllObjects(COMPONENT_INDEX, '_components', name)
    this._hydratedComponentCount = 0
    return removed
  }

  /**
   * Adds an {@link Property} to the component.
   *
   * @param property      The property to add
   * @return The passed in property
   */
  addProperty(property: Property): Property {
    if (!(property instanceof Property)) {
      throw new TypeError('must instance of ICAL.Property')
    }

    if (!this._properties) {
      this._properties = []
      this._hydratedPropertyCount = 0
    }

    if (property.parent) {
      property.parent.removeProperty(property)
    }

    const idx = this.jCal[PROPERTY_INDEX].push(property.jCal)
    this._properties[idx - 1] = property
    this._hydratedPropertyCount++
    property.parent = this
    return property
  }

  /**
   * Helper method to add a property with a value to the component.
   *
   * @param name         Property name to add
   * @param value        Property value
   * @return The created property
   */
  addPropertyWithValue(name: string, value: string | number | object): Property {
    const prop = new Property(name)
    prop.setValue(value)

    this.addProperty(prop)

    return prop
  }

  /**
   * Helper method that will update or create a property of the given name
   * and sets its value. If multiple properties with the given name exist,
   * only the first is updated.
   *
   * @param name Property name to update
   * @param value Property value
   * @return The created property
   */
  updatePropertyWithValue(name: string, value: string | number | object): Property {
    let prop = this.getFirstProperty(name)

    if (prop) {
      prop.setValue(value)
    } else {
      prop = this.addPropertyWithValue(name, value)
    }

    return prop
  }

  /**
   * Removes a single property by name or the instance of the specific
   * property.
   *
   * @param nameOrProp Property name or instance to remove
   * @return True, when deleted
   */
  removeProperty(nameOrProp: string | Property): boolean {
    const removed = this._removeObject(PROPERTY_INDEX, '_properties', nameOrProp)
    if (removed) {
      this._hydratedPropertyCount--
    }
    return removed
  }

  /**
   * Removes all properties associated with this component, optionally
   * filtered by name.
   *
   * @param {String=} name        Lowercase property name
   * @return True, when deleted
   */
  removeAllProperties(name?: string): boolean {
    const removed = this._removeAllObjects(PROPERTY_INDEX, '_properties', name)
    this._hydratedPropertyCount = 0
    return removed
  }

  /**
   * Returns the Object representation of this component. The returned object
   * is a live jCal object and should be cloned if modified.
   * @return {Object}
   */
  toJSON(): object {
    return this.jCal
  }

  /**
   * The string representation of this component.
   * @return {String}
   */
  toString(): string {
    return stringify.component(
      this.jCal as any, this._designSet
    )
  }

  /**
   * Create an {@link ICAL.Component} by parsing the passed iCalendar string.
   *
   * @param str        The iCalendar string to parse
   */
  static fromString(str: string) {
    return new Component(parse.component(str))
  }
}
