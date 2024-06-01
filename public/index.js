import morphdom from 'morphdom'

const ws = new WebSocket('/')
ws.addEventListener('open', () => {})
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

document.querySelector('[data-stl-container]').addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-stl-action')
  if (!action) return

  ws.send(action)
})