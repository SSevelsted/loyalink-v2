// The studio country behind the default phone code. Run with `npm test`.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { studioCountry } from '@/lib/studio-country'

describe('studioCountry', () => {
  it('the studio address country wins', () => {
    assert.equal(studioCountry({ country: 'se', language: 'de', currency: 'EUR' }), 'SE')
  })

  it('no address: the language decides (a German studio opens on +49, not +45)', () => {
    assert.equal(studioCountry({ country: '', language: 'de', currency: 'EUR' }), 'DE')
    assert.equal(studioCountry({ language: 'sv', currency: 'SEK' }), 'SE')
    assert.equal(studioCountry({ language: 'da' }), 'DK')
    assert.equal(studioCountry({ language: 'nb-NO' }), 'NO')
  })

  it('no address and no known language: the currency decides, but EUR never does', () => {
    assert.equal(studioCountry({ language: 'en', currency: 'sek' }), 'SE')
    assert.equal(studioCountry({ currency: 'DKK' }), 'DK')
    assert.equal(studioCountry({ language: 'en', currency: 'EUR' }), undefined)
  })

  it('nothing to go on: undefined, so the form keeps its own fallback', () => {
    assert.equal(studioCountry({}), undefined)
    assert.equal(studioCountry({ country: null, language: 42, currency: undefined }), undefined)
  })
})
