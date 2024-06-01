import morphdom from 'morphdom'

const ws = new WebSocket('/')
ws.addEventListener('open', () => {
  // Could be a DOM listener instead?
  // Send action names up to server
  document.querySelector('[data-stl-container]').addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-stl-action')
    if (!action) return

    ws.send(action)
  })
})

// A message is replacement HTML, use morphdom to stir into existing HTML
ws.addEventListener('message', ({data}) => {
  morphdom(document.querySelector('[data-stl-container]').children[0], data)
})

ws.addEventListener('close', () => {
  console.log('socket closed')
  // re-open ?
})

ws.addEventListener('error', e => {
  console.error(e)
})
