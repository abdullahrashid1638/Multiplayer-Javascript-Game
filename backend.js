const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}
let projectileId = 0

const SPEED = 10
const RADIUS = 10

io.on('connection', (socket) => {
  console.log('a user connected')
  
  io.emit('updatePlayers', backEndPlayers)

  socket.on('initGame', ({ username, w, h, devicePixelRatio }) => {
    console.log(`New Joined Player is "${username}"`)
    backEndPlayers[socket.id] = {
      x: 500 * Math.random(),
      y: 500 * Math.random(),
      color: `hsl(${Math.round(Math.random() * 360)}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    }
    // initing our canvas
    backEndPlayers[socket.id].canvas = { w, h }
    backEndPlayers[socket.id].rad = RADIUS
    if (devicePixelRatio > 1) {
      backEndPlayers[socket.id].rad = RADIUS * 2
    }
  })

  socket.on('initCanvas', ({ w, h, devicePixelRatio }) => {
    
  })

  socket.on('shoot', ({ x, y, angle }) => {
    projectileId++

    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }

    backEndProjectiles[projectileId] = { 
      x,
      y, 
      velocity, 
      playerId: socket.id 
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]
    io.emit('updatePlayers', backEndPlayers)
  })  

  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED
        break;
      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED
        break;
      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED
        break;
      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED
        break;
    }
  })

  // console.log(backEndPlayers)
})

// backend ticker
setInterval(() => {

  // update projectiles' positions here
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

    const PROJECTILE_RADIUS = 3
    if (
      backEndProjectiles[id].x - PROJECTILE_RADIUS >= 
      backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.w || 
      backEndProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS >= 
      backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.h || 
      backEndProjectiles[id].y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id]
      continue
    }

    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId]
      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x, 
        backEndProjectiles[id].y - backEndPlayer.y
      )

      // collision detection
      if (
        DISTANCE < PROJECTILE_RADIUS + backEndPlayer.rad &&
        backEndProjectiles[id].playerId !== playerId
      ) {
        if (backEndPlayers[backEndProjectiles[id].playerId]) {
          backEndPlayers[backEndProjectiles[id].playerId].score++
        }
        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 15)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
