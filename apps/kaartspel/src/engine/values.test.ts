// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { card, joker } from './deck'
import { cardValue, handValue, isValidGroup, sameCard } from './values'

describe('cardValue', () => {
  it('joker telt als -1', () => {
    expect(cardValue(joker(0))).toBe(-1)
  })
  it('aas (rang 14) telt als 1', () => {
    expect(cardValue(card(14, 'spades'))).toBe(1)
  })
  it('boer, vrouw en heer tellen als 10', () => {
    expect(cardValue(card(11, 'hearts'))).toBe(10)
    expect(cardValue(card(12, 'hearts'))).toBe(10)
    expect(cardValue(card(13, 'hearts'))).toBe(10)
  })
  it('2 t/m 10 tellen nominaal', () => {
    expect(cardValue(card(2, 'clubs'))).toBe(2)
    expect(cardValue(card(9, 'clubs'))).toBe(9)
  })
})

describe('handValue', () => {
  it('sommeert, joker verlaagt', () => {
    expect(handValue([card(14, 'hearts'), card(13, 'spades'), joker(0)])).toBe(1 + 10 - 1)
  })
  it('lege hand is 0', () => {
    expect(handValue([])).toBe(0)
  })
})

describe('sameCard', () => {
  it('gelijke kaart', () => {
    expect(sameCard(card(7, 'hearts'), card(7, 'hearts'))).toBe(true)
  })
  it('verschillende suit is niet gelijk', () => {
    expect(sameCard(card(7, 'hearts'), card(7, 'clubs'))).toBe(false)
  })
  it('jokers verschillen op jid', () => {
    expect(sameCard(joker(0), joker(0))).toBe(true)
    expect(sameCard(joker(0), joker(1))).toBe(false)
  })
})

describe('isValidGroup', () => {
  it('lege groep is ongeldig', () => {
    expect(isValidGroup([])).toBe(false)
  })
  it('één losse kaart mag altijd, ook een joker', () => {
    expect(isValidGroup([card(13, 'spades')])).toBe(true)
    expect(isValidGroup([joker(0)])).toBe(true)
  })

  describe('setjes', () => {
    it('paar van dezelfde rang', () => {
      expect(isValidGroup([card(7, 'hearts'), card(7, 'clubs')])).toBe(true)
    })
    it('drie gelijk met een joker als wildcard', () => {
      expect(isValidGroup([card(7, 'hearts'), card(7, 'clubs'), joker(0)])).toBe(true)
    })
    it('twee verschillende rangen is geen setje', () => {
      expect(isValidGroup([card(7, 'hearts'), card(8, 'clubs')])).toBe(false)
    })
  })

  describe('straten', () => {
    it('drie opeenvolgend, suit maakt niet uit', () => {
      expect(isValidGroup([card(3, 'hearts'), card(4, 'clubs'), card(5, 'diamonds')])).toBe(true)
    })
    it('joker vult een gat: 4 J 6 7', () => {
      expect(
        isValidGroup([card(4, 'hearts'), joker(0), card(6, 'clubs'), card(7, 'clubs')]),
      ).toBe(true)
    })
    it('aas is laag: A-2-3 mag', () => {
      expect(isValidGroup([card(14, 'hearts'), card(2, 'clubs'), card(3, 'clubs')])).toBe(true)
    })
    it('Q-K-A is geen straat (aas is laag)', () => {
      expect(isValidGroup([card(12, 'hearts'), card(13, 'clubs'), card(14, 'clubs')])).toBe(false)
    })
    it('één joker kan geen twee gaten vullen: 4 _ _ 7', () => {
      expect(isValidGroup([card(4, 'hearts'), joker(0), card(7, 'clubs')])).toBe(false)
    })
    it('dubbele rang kan niet in een straat', () => {
      expect(isValidGroup([card(4, 'hearts'), card(4, 'clubs'), card(5, 'diamonds')])).toBe(false)
    })
    it('twee losse kaarten zijn geen straat', () => {
      expect(isValidGroup([card(4, 'hearts'), card(5, 'clubs')])).toBe(false)
    })
  })
})
