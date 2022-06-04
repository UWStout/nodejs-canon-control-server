// Import the socket.io library
import * as io from 'socket.io'

// Web socket message handler
import { enableSocketServer, setSocketServer, setupSocketClient } from './api/cameraMonitor.js'

// Read env variables from the .env file
import dotenv from 'dotenv'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:socket')

// Adjust env based on .env file
dotenv.config()

// Our root socket instance
let mySocket = null
export function getMySocket () {
  return mySocket
}

// Integrate our web-sockets route with the express server
export function makeSocket (serverListener) {
  debug('Setting up sockets')

  // Setup web-sockets with session middleware
  mySocket = new io.Server(serverListener)
  setSocketServer(mySocket)

  // Respond to new socket connections
  mySocket.on('connection', (socket) => {
    debug(`[WS:${socket.id}] New ${socket.request.session.type} connection`)

    // Configure our custom message responses
    setupSocketClient(socket)

    // Respond to disconnect events
    socket.on('disconnect', socketDisconnect.bind(socket))

    // Internal ping
    const boundSocketPing = socketPing.bind(socket)
    socket.conn.on('packet', (packet) => {
      if (packet.type === 'ping' || packet.type === 'pong') {
        boundSocketPing()
      }
    })
  })

  // Catch and log errors
  mySocket.on('error', (err) => {
    debug('Socket.io error:')
    debug(err)
  })

  // Return the socket.io interface
  return mySocket
}

// Call once server is ready and listening
export function serverReady () {
  enableSocketServer(true)
}

// Respond to socket.disconnect events
// - 'this' = current socket
function socketDisconnect (reason) {
  debug(`[WS:${this.id}] ${this.request.session.type} disconnected because - ${reason}`)
}

// Log the ping from a client
// - 'this' = current socket
function socketPing () {
  debug(`[WS:${this.id}] websocket ping`)
}
