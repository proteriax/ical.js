import { unescapedIndexOf } from './helpers'
import { DesignSet, design } from './design'

/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2015 */

const CHAR = /[^ \t]/
const MULTIVALUE_DELIMITER = ','
const VALUE_DELIMITER = ':'
const PARAM_DELIMITER = ';'
const PARAM_NAME_DELIMITER = '='
const DEFAULT_VALUE_TYPE = 'unknown'
const DEFAULT_PARAM_TYPE = 'text'

/**
 * An error that occurred during parsing.
 * @param message The error message
 */
class ParserError extends Error {
  name = 'ParserError'
  constructor(message) {
    super(message)
    try {
      throw new Error()
    } catch (e) {
      if (e.stack) {
        const split = e.stack.split('\n')
        split.shift()
        this.stack = split.join('\n')
      }
    }
  }
}

/**
 * Parses iCalendar or vCard data into a raw jCal object. Consult
 * documentation on the {@tutorial layers|layers of parsing} for more
 * details.
 *
 * @function ICAL.parse
 * @variation function
 * @todo Fix the API to be more clear on the return type
 * @param input      The string data to parse
 * @return  A single jCal object, or an array thereof
 */
export function parse(input: string): any {
  const state = {
    component: [],
    stack: [],
  }
  const root = state.component
  state.stack = [root] as any

  parse._eachLine(input, function (err, line) {
    parse._handleContentLine(line, state)
  })


  // when there are still items on the stack
  // throw a fatal error, a component was not closed
  // correctly in that case.
  if (state.stack.length > 1) {
    throw new ParserError(
      'invalid ical body. component began but did not end'
    )
  }

  return root.length === 1 ? root[0] : root
}

/**
 * Parse an iCalendar property value into the jCal for a single property
 *
 * @function ICAL.parse.property
 * @param str
 *   The iCalendar property string to parse
 * @param designSet
 *   The design data to use for this property
 * @return
 *   The jCal Object containing the property
 */
parse.property = function (str: string, designSet?: DesignSet): any {
  const state = {
    component: [[], []],
    designSet: designSet || design.defaultSet
  }
  parse._handleContentLine(str, state)
  return state.component[1][0]
}

/**
 * Convenience method to parse a component. You can use ICAL.parse() directly
 * instead.
 *
 * @function ICAL.parse.component
 * @see ICAL.parse(function)
 * @param str    The iCalendar component string to parse
 * @return       The jCal Object containing the component
 */
parse.component = function (str: string): any {
  return parse(str)
}

// classes & constants
parse.ParserError = ParserError

/**
 * The state for parsing content lines from an iCalendar/vCard string.
 *
 * @private
 * @memberof ICAL.parse
 * @typedef {Object} parserState
 * @property {ICAL.design.designSet} designSet    The design set to use for parsing
 * @property {ICAL.Component[]} stack             The stack of components being processed
 * @property {ICAL.Component} component           The currently active component
 */


/**
 * Handles a single line of iCalendar/vCard, updating the state.
 *
 * @private
 * @function ICAL.parse._handleContentLine
 * @param line               The content line to process
 * @param {ICAL.parse.parserState}    The current state of the line parsing
 */
parse._handleContentLine = function (line: string, state) {
  // break up the parts of the line
  const valuePos = line.indexOf(VALUE_DELIMITER)
  let paramPos = line.indexOf(PARAM_DELIMITER)

  let lastParamIndex
  let lastValuePos

  // name of property or begin/end
  let name
  let value
  // params is only overridden if paramPos !== -1.
  // we can't do params = params || {} later on
  // because it sacrifices ops.
  let params: any = {}

  /**
   * Different property cases
   *
   *
   * 1. RRULE:FREQ=foo
   *    // FREQ= is not a param but the value
   *
   * 2. ATTENDEE;ROLE=REQ-PARTICIPANT;
   *    // ROLE= is a param because : has not happened yet
   */
    // when the parameter delimiter is after the
    // value delimiter then its not a parameter.

  if ((paramPos !== -1 && valuePos !== -1)) {
    // when the parameter delimiter is after the
    // value delimiter then its not a parameter.
    if (paramPos > valuePos) {
      paramPos = -1
    }
  }

  let parsedParams
  if (paramPos !== -1) {
    name = line.substring(0, paramPos).toLowerCase()
    parsedParams = parse._parseParameters(line.substring(paramPos), 0, state.designSet)
    if (parsedParams[2] === -1) {
      throw new ParserError("Invalid parameters in '" + line + "'")
    }
    params = parsedParams[0]
    lastParamIndex = parsedParams[1].length + parsedParams[2] + paramPos
    if ((lastValuePos =
      line.substring(lastParamIndex).indexOf(VALUE_DELIMITER)) !== -1) {
      value = line.substring(lastParamIndex + lastValuePos + 1)
    } else {
      throw new ParserError("Missing parameter value in '" + line + "'")
    }
  } else if (valuePos !== -1) {
    // without parmeters (BEGIN:VCAENDAR, CLASS:PUBLIC)
    name = line.substring(0, valuePos).toLowerCase()
    value = line.substring(valuePos + 1)

    if (name === 'begin') {
      const newComponent = [value.toLowerCase(), [], []]
      if (state.stack.length === 1) {
        state.component.push(newComponent)
      } else {
        state.component[2].push(newComponent)
      }
      state.stack.push(state.component)
      state.component = newComponent
      if (!state.designSet) {
        state.designSet = design.getDesignSet(state.component[0])
      }
      return
    } else if (name === 'end') {
      state.component = state.stack.pop()
      return
    }
    // If its not begin/end, then this is a property with an empty value,
    // which should be considered valid.
  } else {
    /**
     * Invalid line.
     * The rational to throw an error is we will
     * never be certain that the rest of the file
     * is sane and its unlikely that we can serialize
     * the result correctly either.
     */
    throw new ParserError(
      'invalid line (no token ";" or ":") "' + line + '"'
    )
  }

  let valueType
  let multiValue
  let structuredValue
  let propertyDetails

  if (name in state.designSet.property) {
    propertyDetails = state.designSet.property[name]

    if ('multiValue' in propertyDetails) {
      multiValue = propertyDetails.multiValue
    }

    if ('structuredValue' in propertyDetails) {
      structuredValue = propertyDetails.structuredValue
    }

    if (value && 'detectType' in propertyDetails) {
      valueType = propertyDetails.detectType(value)
    }
  }

  // attempt to determine value
  if (!valueType) {
    if (!('value' in params)) {
      if (propertyDetails) {
        valueType = propertyDetails.defaultType
      } else {
        valueType = DEFAULT_VALUE_TYPE
      }
    } else {
      // possible to avoid this?
      valueType = params.value.toLowerCase()
    }
  }

  delete params.value

  /**
   * Note on `var result` juggling:
   *
   * I observed that building the array in pieces has adverse
   * effects on performance, so where possible we inline the creation.
   * Its a little ugly but resulted in ~2000 additional ops/sec.
   */

  let result
  if (multiValue && structuredValue) {
    value = parse._parseMultiValue(value, structuredValue, valueType, [], multiValue, state.designSet, structuredValue)
    result = [name, params, valueType, value]
  } else if (multiValue) {
    result = [name, params, valueType]
    parse._parseMultiValue(value, multiValue, valueType, result, null, state.designSet, false)
  } else if (structuredValue) {
    value = parse._parseMultiValue(value, structuredValue, valueType, [], null, state.designSet, structuredValue)
    result = [name, params, valueType, value]
  } else {
    value = parse._parseValue(value, valueType, state.designSet, false)
    result = [name, params, valueType, value]
  }
  // rfc6350 requires that in vCard 4.0 the first component is the VERSION
  // component with as value 4.0, note that 3.0 does not have this requirement.
  if (state.component[0] === 'vcard' && state.component[1].length === 0 &&
          !(name === 'version' && value === '4.0')) {
    state.designSet = design.getDesignSet('vcard3')
  }
  state.component[1].push(result)
}

/**
 * Parse a value from the raw value into the jCard/jCal value.
 *
 * @private
 * @function ICAL.parse._parseValue
 * @param value          Original value
 * @param type           Type of value
 * @param designSet      The design data to use for this value
 * @return varies on type
 */
parse._parseValue = function (value: string, type: string, designSet: DesignSet, structuredValue?): object {
  if (type in designSet.value && 'fromICAL' in designSet.value[type]) {
    return designSet.value[type].fromICAL(value, structuredValue)
  }
  return value as any
}

/**
 * Parse parameters from a string to object.
 *
 * @function ICAL.parse._parseParameters
 * @private
 * @param line           A single unfolded line
 * @param start         Position to start looking for properties
 * @param designSet      The design data to use for this property
 * @return key/value pairs
 */
parse._parseParameters = function (line: string, start: number, designSet: DesignSet): object {
  let lastParam = start
  let pos: false | number = 0
  const delim = PARAM_NAME_DELIMITER
  const result = {}
  let name, lcname
  let value, valuePos = -1
  let type, multiValue, mvdelim

  // find the next '=' sign
  // use lastParam and pos to find name
  // check if " is used if so get value from "->"
  // then increment pos to find next ;

  while ((pos !== false) &&
          (pos = unescapedIndexOf(line, delim, pos + 1)) !== -1) {

    name = line.substr(lastParam + 1, pos - lastParam - 1)
    if (name.length === 0) {
      throw new ParserError("Empty parameter name in '" + line + "'")
    }
    lcname = name.toLowerCase()

    if (lcname in designSet.param && designSet.param[lcname].valueType) {
      type = designSet.param[lcname].valueType
    } else {
      type = DEFAULT_PARAM_TYPE
    }

    if (lcname in designSet.param) {
      multiValue = designSet.param[lcname].multiValue
      if (designSet.param[lcname].multiValueSeparateDQuote) {
        mvdelim = parse._rfc6868Escape('"' + multiValue + '"')
      }
    }

    const nextChar = line[pos + 1]
    if (nextChar === '"') {
      valuePos = pos + 2
      pos = unescapedIndexOf(line, '"', valuePos)
      if (multiValue && pos !== -1) {
          let extendedValue = true
          while (extendedValue) {
            if (line[pos + 1] === multiValue && line[pos + 2] === '"') {
              pos = unescapedIndexOf(line, '"', pos + 3)
            } else {
              extendedValue = false
            }
          }
        }
      if (pos === -1) {
        throw new ParserError(
          'invalid line (no matching double quote) "' + line + '"'
        )
      }
      value = line.substr(valuePos, pos - valuePos)
      lastParam = unescapedIndexOf(line, PARAM_DELIMITER, pos)
      if (lastParam === -1) {
        pos = false
      }
    } else {
      valuePos = pos + 1

      // move to next ";"
      let nextPos = unescapedIndexOf(line, PARAM_DELIMITER, valuePos)
      const propValuePos = unescapedIndexOf(line, VALUE_DELIMITER, valuePos)
      if (propValuePos !== -1 && nextPos > propValuePos) {
        // this is a delimiter in the property value, let's stop here
        nextPos = propValuePos
        pos = false
      } else if (nextPos === -1) {
        // no ";"
        if (propValuePos === -1) {
          nextPos = line.length
        } else {
          nextPos = propValuePos
        }
        pos = false
      } else {
        lastParam = nextPos
        pos = nextPos
      }

      value = line.substr(valuePos, nextPos - valuePos)
    }

    value = parse._rfc6868Escape(value)
    if (multiValue) {
      const delimiter = mvdelim || multiValue
      result[lcname] = parse._parseMultiValue(value, delimiter, type, [], null, designSet)
    } else {
      result[lcname] = parse._parseValue(value, type, designSet)
    }
  }
  return [result, value, valuePos]
}

/**
 * Internal helper for rfc6868. Exposing this on ICAL.parse so that
 * hackers can disable the rfc6868 parsing if the really need to.
 *
 * @function ICAL.parse._rfc6868Escape
 * @param val        The value to escape
 * @return           The escaped value
 */
parse._rfc6868Escape = function (val: string): string {
  return val.replace(/\^['n^]/g, function (x) {
    return RFC6868_REPLACE_MAP[x]
  })
}
const RFC6868_REPLACE_MAP = { "^'": '"', '^n': '\n', '^^': '^' }

/**
 * Parse a multi value string. This function is used either for parsing
 * actual multi-value property's values, or for handling parameter values. It
 * can be used for both multi-value properties and structured value properties.
 *
 * @private
 * @function ICAL.parse._parseMultiValue
 * @param buffer     The buffer containing the full value
 * @param delim      The multi-value delimiter
 * @param type       The value type to be parsed
 * @param result        The array to append results to, varies on value type
 * @param innerMulti The inner delimiter to split each value with
 * @param designSet   The design data for this value
 * @return  Either an array of results, or the first result
 */
parse._parseMultiValue = function (buffer: string, delim: string, type: string, result: Array<any>, innerMulti: string | false | undefined | null, designSet: DesignSet, structuredValue?): any | Array<any> {
  let pos = 0
  let lastPos = 0
  let value
  if (delim.length === 0) {
    return buffer
  }

  // split each piece
  while ((pos = unescapedIndexOf(buffer, delim, lastPos)) !== -1) {
    value = buffer.substr(lastPos, pos - lastPos)
    if (innerMulti) {
      value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue)
    } else {
      value = parse._parseValue(value, type, designSet, structuredValue)
    }
    result.push(value)
    lastPos = pos + delim.length
  }

  // on the last piece take the rest of string
  value = buffer.substr(lastPos)
  if (innerMulti) {
    value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue)
  } else {
    value = parse._parseValue(value, type, designSet, structuredValue)
  }
  result.push(value)

  return result.length === 1 ? result[0] : result
}

/**
 * Process a complete buffer of iCalendar/vCard data line by line, correctly
 * unfolding content. Each line will be processed with the given callback
 *
 * @private
 * @function ICAL.parse._eachLine
 * @param buffer                         The buffer to process
 * @param {function(?String, String)} callback    The callback for each line
 */
parse._eachLine = function (buffer: string, callback: (arg0: string | null, arg1: string) => void) {
  const len = buffer.length
  let lastPos = buffer.search(CHAR)
  let pos = lastPos
  let line
  let firstChar

  let newlineOffset

  do {
    pos = buffer.indexOf('\n', lastPos) + 1

    if (pos > 1 && buffer[pos - 2] === '\r') {
      newlineOffset = 2
    } else {
      newlineOffset = 1
    }

    if (pos === 0) {
      pos = len
      newlineOffset = 0
    }

    firstChar = buffer[lastPos]

    if (firstChar === ' ' || firstChar === '\t') {
      // add to line
      line += buffer.substr(
        lastPos + 1,
        pos - lastPos - (newlineOffset + 1)
      )
    } else {
      if (line)
        callback(null, line)
      // push line
      line = buffer.substr(
        lastPos,
        pos - lastPos - newlineOffset
      )
    }

    lastPos = pos
  } while (pos !== len)

  // extra ending line
  line = line.trim()

  if (line.length)
    callback(null, line)
}

