/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015
 */

/**
 * Represents the BINARY value type, which contains extra methods for
 * encoding and decoding.
 */
export class Binary {
  value: null | string

  /**
   * @param aValue The binary data for this value
   */
  constructor(aValue?: string) {
    this.value = aValue || null
  }

  /**
   * The type name, to be used in the jCal object.
   */
  readonly icaltype = 'binary'

  /**
   * Base64 decode the current value
   *
   * @return The base64-decoded value
   */
  decodeValue() {
    return this._b64_decode(this.value)
  }

  /**
   * Encodes the passed parameter with base64 and sets the internal
   * value to the result.
   *
   * @param aValue      The raw binary value to encode
   */
  setEncodedValue(aValue: null | string) {
    this.value = this._b64_encode(aValue)
  }

  private _b64_encode(data: null | string) {
    // http://kevin.vanzonneveld.net
    // +   original by: Tyler Akins (http://rumkin.com)
    // +   improved by: Bayron Guevara
    // +   improved by: Thunder.m
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Pellentesque Malesuada
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Rafał Kukawski (http://kukawski.pl)
    // *     example 1: base64_encode('Kevin van Zonneveld');
    // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
    // mozilla has this native
    // - but breaks in 2.0.0.12!
    // if (typeof this.window['atob'] == 'function') {
    //    return atob(data);
    // }
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    let i = 0,
      ac = 0,
      enc = ''
    const tmp_arr: string[] = []

    if (!data) {
      return data
    }

    do { // pack three octets into four hexets
      const o1 = data.charCodeAt(i++)
      const o2 = data.charCodeAt(i++)
      const o3 = data.charCodeAt(i++)

      const bits = o1 << 16 | o2 << 8 | o3

      const h1 = bits >> 18 & 0x3f
      const h2 = bits >> 12 & 0x3f
      const h3 = bits >> 6 & 0x3f
      const h4 = bits & 0x3f

      // use hexets to index into b64, and append result to encoded string
      tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4)
    } while (i < data.length)

    enc = tmp_arr.join('')

    const r = data.length % 3

    return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3)

  }

  private _b64_decode(data: null | string) {
    // http://kevin.vanzonneveld.net
    // +   original by: Tyler Akins (http://rumkin.com)
    // +   improved by: Thunder.m
    // +      input by: Aman Gupta
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +   bugfixed by: Pellentesque Malesuada
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
    // *     returns 1: 'Kevin van Zonneveld'
    // mozilla has this native
    // - but breaks in 2.0.0.12!
    // if (typeof this.window['btoa'] == 'function') {
    //    return btoa(data);
    // }
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz0123456789+/='
    let i = 0,
      ac = 0,
      dec = ''
    const tmp_arr: string[] = []

    if (!data) {
      return data
    }

    data += ''

    do { // unpack four hexets into three octets using index points in b64
      const h1 = b64.indexOf(data.charAt(i++))
      const h2 = b64.indexOf(data.charAt(i++))
      const h3 = b64.indexOf(data.charAt(i++))
      const h4 = b64.indexOf(data.charAt(i++))

      const bits = h1 << 18 | h2 << 12 | h3 << 6 | h4

      const o1 = bits >> 16 & 0xff
      const o2 = bits >> 8 & 0xff
      const o3 = bits & 0xff

      if (h3 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1)
      } else if (h4 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1, o2)
      } else {
        tmp_arr[ac++] = String.fromCharCode(o1, o2, o3)
      }
    } while (i < data.length)

    dec = tmp_arr.join('')

    return dec
  }

  /**
   * The string representation of this value
   */
  toString(): string {
    return this.value || ''
  }

  /**
   * Creates a binary value from the given string.
   *
   * @param aString The binary value string
   * @return The binary value instance
   */
  static fromString(aString: string): Binary {
    return new Binary(aString)
  }
}
