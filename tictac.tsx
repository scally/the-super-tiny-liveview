import { live } from './lib/live'
import { randomUUID } from 'node:crypto'

type RandomUUID = ReturnType<typeof randomUUID>

Bun.serve(live({
  debug: true,
  local: {
    playerId: null as RandomUUID | null
  },
  shared: {
    players: Array<RandomUUID>(),
    moves: Array<{row: string, col: string}>()
  },
  mount({ local, }) {
    local.playerId = randomUUID()
  },
  dispatch({ local, message, shared, }) {
    switch (message.type) {
      case 'move':
        if (!local.playerId || !shared.players.includes(local.playerId)) {
          // You aren't assigned a player id in this game
          return
        }
        if (localPlayerName(shared.players, local.playerId) === 'X' && shared.moves.length % 2 !== 0) {
          // It's not your move
          return
        }
        if (localPlayerName(shared.players, local.playerId) === 'O' && shared.moves.length % 2 === 0) {
          // It's not your move
          return
        }
        if (shared.moves.some(({row, col}) => row === message.payload?.row && col === message.payload?.col)) {
          // This spot has already been played
          return
        }
        if (isGameOver(shared.moves)) {
          return
        }

        shared.moves.push(message.payload as any)
        break
      case 'reset':
        shared.moves = []
        shared.players = []
        break
      case 'join':
        switch (shared.players.length) {
          case 0:
            shared.players.push(local.playerId)
            break
          case 1:
            shared.players.push(local.playerId)
            break
          default:
            break
        }
        break
      default: 
        break
    }
  },
  render({local, shared}) {
    return (
      <div style={{display: 'flex', padding: '40px', flexDirection: 'column', gap: '20px'}}>
        {
          localPlayerName(shared.players, local.playerId) === 'X' ? <div>playing as X</div> : null
        }
        {
          localPlayerName(shared.players, local.playerId) === 'O' ? <div>playing as O</div> : null
        }
        {
          localPlayerName(shared.players, local.playerId) === null && shared.players.length < 2 ? <button type='button' data-stl-action='join' style={{height: '40px'}}>Join</button> : null
        }        
        <div style={{display: 'flex', flexDirection: 'column'}}>
          {
            <GridComponent shared={shared} />
          }
          {
            isGameOver(shared.moves) && 
              (
                isTie(shared.moves) ? 
                  `It's a tie` : 
                  `The winner is ${calculateWinner(shared.moves)}`
              )
          }
        </div>
        <button type='button' data-stl-action='reset' style={{height: '40px'}}>Reset</button>
      </div>
    )
  },
}))

const GridComponent = ({shared}: any) => {
  return movesToGrid(shared.moves).map((col, colIndex) => {
    return <div key={colIndex} style={{display: 'flex', flexDirection: 'row'}}>
      {
        col.map((row, rowIndex) => {
          return (
            <div data-stl-action='move' data-stl-payload-col={colIndex} data-stl-payload-row={rowIndex} key={`${colIndex}-${rowIndex}`} style={{border: '1px solid black', width: '80px', height: '80px', textAlign: 'center'}}>
              {row}
            </div>
          )
        })
      }
    </div>
  })
}

interface Move {
  row: string
  col: string
}

type Grid = ('X' | 'O' | null )[][]

const localPlayerName = (players: ReturnType<typeof randomUUID>[], localId: ReturnType<typeof randomUUID>) => 
  players.indexOf(localId) === 0 ? 'X' : players.indexOf(localId) === 1 ? 'O' : null

const movesToGrid = (moves: Move[]): Grid => {
  return moves.reduce((prev, {row, col}, index) => {
    let player = 'X'
    if (index % 2 !== 0)  {
      player = 'O'
    } 
    prev[Number(col)][Number(row)] = player

    return prev
  }, [Array(3).fill(null), Array(3).fill(null), Array(3).fill(null)] satisfies Grid)
}

const isGameOver = (moves: Move[]) =>
  calculateWinner(moves) !== null || isBoardFilled(moves)

const isTie = (moves: Move[]) => 
  isGameOver(moves) && calculateWinner(moves) === null

const isBoardFilled = (moves: Move[]) =>
  moves.length === 9

const calculateWinner = (moves: Move[]) => {
  const grid = movesToGrid(moves)

  const checkCoords = [
    [[0,0], [0,1], [0,2]],
    [[1,0], [1,1], [1,2]],
    [[2,0], [2,1], [2,2]],

    [[0,0], [1,0], [2,0]],
    [[0,1], [1,1], [2,2]],
    [[0,2], [1,2], [2,2]],

    [[0,0], [1,1], [2,2]],
    [[2,0], [1,1], [0,2]],
  ]

  const checkFor = (player: 'X' | 'O') => checkCoords.some(coords => {
    return coords.every(coord => {
      return grid[coord[0]][coord[1]] === player
    })
  })

  if (checkFor('X')) {
    return 'X'
  }

  if (checkFor('O')) {
    return 'O'
  }

  return null
}

