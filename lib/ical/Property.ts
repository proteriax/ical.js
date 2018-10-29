/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

import { design, DesignSet } from './design'
import { stringify } from './stringify'
import { parse } from './parse'
import { Component } from './Component'

const enum Index {
  Name, Prop, Type, Value
}

/**
 * @classdesc
 * Provides a layer on top of the raw jCal object for manipulating a single
 * property, with its parameters and value.
 *
 * @description
 * Its important to note that mutations done in the wrapper
 * directly mutate the jCal object used to initialize.
 *
 * Can also be used to create new properties by passing
 * the name of the property (as a String).
 *

 */
export class Property<V = any> {
  jCal
  private _parent?: Component
  private _values: V[]
  isDecorated: boolean
  isMultiValue: boolean
  isStructuredValue: boolean

  /**
   * @param jCal Raw jCal representation OR the new name of the property
   * @param {Component=} parent    Parent component
   */
  constructor(jCal: string | any[], parent?: Component) {
    this._parent = parent

    if (typeof jCal === 'string') {
      // We are creating the property by name and need to detect the type
      this.jCal = [jCal, {}, design.defaultType]
      this.jCal[Index.Type] = this.getDefaultType()
    } else {
      this.jCal = [...jCal]
    }
    this._updateType()
  }

  /**
   * The value type for this property
   * @readonly
   */
  get type() {
    return this.jCal[Index.Type]
  }

  /**
   * The name of this property, in lowercase.
   * @readonly
   */
  get name() {
    return this.jCal[Index.Name]
  }

  /**
   * The parent component for this property.
   */
  get parent() {
    return this._parent
  }

  set parent(p) {
    // Before setting the parent, check if the design set has changed. If it
    // has, we later need to update the type if it was unknown before.
    const designSetChanged = !this._parent || (p && p._designSet !== this._parent._designSet)

    this._parent = p

    if (this.type === design.defaultType && designSetChanged) {
      this.jCal[Index.Type] = this.getDefaultType()
      this._updateType()
    }
  }

  /**
   * The design set for this property, e.g. icalendar vs vcard
   */
  private get _designSet(): DesignSet {
    return this.parent ? this.parent._designSet : design.defaultSet
  }

  /**
   * Updates the type metadata from the current jCal type and design set.
   */
  private _updateType() {
    const designSet = this._designSet

    if (this.type in designSet.value) {
      if ('decorate' in designSet.value[this.type]) {
        this.isDecorated = true
      } else {
        this.isDecorated = false
      }

      if (this.name in designSet.property) {
        this.isMultiValue = ('multiValue' in designSet.property[this.name])
        this.isStructuredValue = ('structuredValue' in designSet.property[this.name])
      }
    }
  }

  /**
   * Hydrate a single value. The act of hydrating means turning the raw jCal
   * value into a potentially wrapped object, for example {@link Time}.
   *
   * @param index The index of the value to hydrate
   * @return The decorated value.
   */
  private _hydrateValue(index: number): undefined | V {
    if (this._values && this._values[index]) {
      return this._values[index]
    }

    // for the case where there is no value.
    if (this.jCal.length <= (Index.Value + index)) {
      return
    }

    if (this.isDecorated) {
      if (!this._values) {
        this._values = []
      }
      this._values[index] = this._decorate(
        this.jCal[Index.Value + index]
      )
      return this._values[index]
    } else {
      return this.jCal[Index.Value + index]
    }
  }

  /**
   * Decorate a single value, returning its wrapped object. This is used by
   * the hydrate function to actually wrap the value.
   *
   * @param {?} value         The value to decorate
   * @return The decorated value
   */
  private _decorate(value: any): any {
    return this._designSet.value[this.type].decorate!(value, this)
  }

  /**
   * Undecorate a single value, returning its raw jCal data.
   *
   * @param value         The value to undecorate
   * @return {?}                   The undecorated value
   */
  private _undecorate(value: object): any {
    return this._designSet.value[this.type].undecorate!(value, this)
  }

  /**
   * Sets the value at the given index while also hydrating it. The passed
   * value can either be a decorated or undecorated value.
   *
   * @private
   * @param {?} value             The value to set
   * @param index        The index to set it at
   */
  private _setDecoratedValue(value: any, index: number) {
    if (!this._values) {
      this._values = []
    }

    if (typeof(value) === 'object' && 'icaltype' in value) {
      // decorated value
      this.jCal[Index.Value + index] = this._undecorate(value)
      this._values[index] = value
    } else {
      // undecorated value
      this.jCal[Index.Value + index] = value
      this._values[index] = this._decorate(value)
    }
  }

  /**
   * Gets a parameter on the property.
   *
   * @param name   Property name (lowercase)
   * @return  Property value
   */
  getParameter(name: string): Array<any> | string | undefined {
    if (name in this.jCal[Index.Prop]) {
      return this.jCal[Index.Prop][name]
    }
  }

  /**
   * Gets first parameter on the property.
   *
   * @param name Property name (lowercase)
   * @return Property value
   */
  getFirstParameter(name: string): string {
    const parameters = this.getParameter(name)

    if (Array.isArray(parameters)) {
      return parameters[0]
    }

    return parameters!
  }

  /**
   * Sets a parameter on the property.
   *
   * @param name     The parameter name
   * @param value    The parameter value
   */
  setParameter(name: string, value: Array<any> | string) {
    const lcname = name.toLowerCase()
    if (typeof value === 'string' &&
        lcname in this._designSet.param &&
        'multiValue' in this._designSet.param[lcname]) {
        value = [value]
    }
    this.jCal[Index.Prop][name] = value
  }

  /**
   * Removes a parameter
   *
   * @param name     The parameter name
   */
  removeParameter(name: string) {
    delete this.jCal[Index.Prop][name]
  }

  /**
   * Get the default type based on this property's name.
   *
   * @return The default type for this property
   */
  getDefaultType(): string {
    const name = this.jCal[Index.Name]
    const designSet = this._designSet

    if (name in designSet.property) {
      const details = designSet.property[name]
      if ('defaultType' in details) {
        return details.defaultType!
      }
    }
    return design.defaultType
  }

  /**
   * Sets type of property and clears out any existing values of the current
   * type.
   *
   * @param type     New iCAL type (see design.*.values)
   */
  resetType(type: string) {
    this.removeAllValues()
    this.jCal[Index.Type] = type
    this._updateType()
  }

  /**
   * Finds the first property value.
   *
   * @return First property value
   */
  getFirstValue(): V {
    return this._hydrateValue(0)!
  }

  /**
   * Gets all values on the property.
   *
   * NOTE: this creates an array during each call.
   *
   * @return List of values
   */
  getValues(): Array<V> {
    const len = this.jCal.length - Index.Value

    if (len < 1) {
      // its possible for a property to have no value.
      return []
    }

    let i = 0
    const result: V[] = []

    for (; i < len; i++) {
      result[i] = this._hydrateValue(i)!
    }

    return result
  }

  /**
   * Removes all values from this property
   */
  removeAllValues() {
    if (this._values) {
      this._values.length = 0
    }
    this.jCal.length = 3
  }

  /**
   * Sets the values of the property.  Will overwrite the existing values.
   * This can only be used for multi-value properties.
   *
   * @param values    An array of values
   */
  setValues(values: Array<any>) {
    if (!this.isMultiValue) {
      throw new Error(
        `${this.name}: does not not support mulitValue.\noverride isMultiValue`
      )
    }

    const len = values.length
    let i = 0
    this.removeAllValues()

    if (len > 0 &&
        typeof(values[0]) === 'object' &&
        'icaltype' in values[0]) {
      this.resetType(values[0].icaltype)
    }

    if (this.isDecorated) {
      for (; i < len; i++) {
        this._setDecoratedValue(values[i], i)
      }
    } else {
      for (; i < len; i++) {
        this.jCal[Index.Value + i] = values[i]
      }
    }
  }

  /**
   * Sets the current value of the property. If this is a multi-value
   * property, all other values will be removed.
   *
   * @param value     New property value.
   */
  setValue(value: any) {
    this.removeAllValues()
    if (typeof(value) === 'object' && 'icaltype' in value) {
      this.resetType(value.icaltype)
    }

    if (this.isDecorated) {
      this._setDecoratedValue(value, 0)
    } else {
      this.jCal[Index.Value] = value
    }
  }

  /**
   * Returns the Object representation of this component. The returned object
   * is a live jCal object and should be cloned if modified.
   * @return {Object}
   */
  toJSON(): any {
    return this.jCal
  }

  /**
   * The string representation of this component.
   * @return {String}
   */
  toICALString(): string {
    return stringify.property(
      this.jCal, this._designSet, true
    )
  }

  /**
   * Create an {@link Property} by parsing the passed iCalendar string.
   *
   * @param str                        The iCalendar string to parse
   * @param {DesignSet=} designSet  The design data to use for this property
   * @return The created iCalendar property
   */
  static fromString(str: string, designSet?: DesignSet): Property {
    return new Property(parse.property(str, designSet))
  }
}
