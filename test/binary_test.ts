import { getICAL } from './ical'
import { expect } from 'chai'
import { describe, it } from 'mocha'

const ICAL = getICAL()

describe('ICAL.Binary', () => {
  const subject = new ICAL.Binary()
  it('sets encoded value', () => {
    subject.setEncodedValue('bananas')
    expect(subject.decodeValue()).to.equal('bananas')
    expect(subject.value).to.equal('YmFuYW5hcw==')

    subject.setEncodedValue('apples')
    expect(subject.decodeValue()).to.equal('apples')
    expect(subject.value).to.equal('YXBwbGVz')
  })

  it('accepts null values', () => {
    subject.setEncodedValue(null)
    expect(subject.decodeValue()).to.be.null
    expect(subject.value).to.be.null
  })
})
