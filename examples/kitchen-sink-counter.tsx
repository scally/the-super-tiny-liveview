import { live } from "../lib/live"

const server = Bun.serve(
  live({
    shared: {
      count: 0,
      nums: Array<number>()
    },
    local: {
      count: 0,
      nums: Array<number>()
    },
    mount: ({addTimer, local}) => {
      addTimer(1000, {
        type: 'tick'
      })
      addTimer(2000, {
        type: 'tick2'
      })
    },
    render: ({local, shared}) => {
      return (
        <div>
          <CounterPart label='Local Count' count={local.count} />
          <CounterPart label='Global Count' count={shared.count} />
          <div style={{display: 'flex', flexDirection: 'row'}}>
            Local Nums: 
            {
              local.nums?.map(n => <div key={n}>{n}</div>)
            }
          </div>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            Global Nums: 
            {
              shared.nums?.map(n => <div key={n}>{n}</div>)
            }
          </div>
          <button type='button' data-stl-action='inc100'>Local Inc 100</button>
          <button type='button' data-stl-action='global-inc'>Global Inc 1</button>
          <button type='button' data-stl-action='global-inc-nums'>Global Inc Nums</button>
        </div>
      )
    },
    dispatch: ({local, message, shared}) => {
      switch (message.type) {
        case 'tick':
          local.count += 1
          break
        case 'tick2':
          local.nums.push(local.nums.length)
          break
        case 'inc100':
          local.count += 100
          break
        case 'global-inc':
          shared.count += 1
          break
        case 'global-inc-nums':
          shared.nums.push(shared.nums.length)
          break
        default:
          break
      }
    },
  })
)

const CounterPart = ({count, label}: {count: number, label: string}) => {
  return (
    <h1>{label}: {count}</h1>
  )
}

console.log(`Server running at http://${server.hostname}:${server.port}`)
