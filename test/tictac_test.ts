import { describe, expect, it } from 'bun:test'
import { calculateWinnerForGrid, movesToGrid } from '../examples/tictac'

describe('tictac', () => {
  describe('movesToGrid', () => {
    it('works for simple game', () => {
      expect(movesToGrid([
        {row: '0', col: '0'},
        {row: '1', col: '1'},
        {row: '0', col: '1'},
        {row: '2', col: '2'},
        {row: '0', col: '2'},
      ])).toEqual([
        ['X', null, null],
        ['X', 'O', null],
        ['X', null, 'O'],
      ])
    })
  })

  describe('calculateWinnerForGrid', () => {
    it('is X for simple game with col winner', () => {
      expect(calculateWinnerForGrid([
        ['X', null, null],
        ['X', 'O', null],
        ['X', null, 'O'],
      ])).toEqual('X')
    })

    it('is O for simple game with col winner', () => {
      expect(calculateWinnerForGrid([
        ['O', null, null],
        ['O', 'X', 'X'],
        ['O', null, 'X'],
      ])).toEqual('O')
    })

    it('is O for game with more moves and col winner', () => {
      expect(calculateWinnerForGrid([
        ['O', 'X', 'X'],
        ['O', 'X', 'O'],
        ['O', null, 'X'],
      ])).toEqual('O')
    })
  })
})