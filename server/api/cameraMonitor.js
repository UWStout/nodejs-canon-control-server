// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

// API Helper interface
import { setupEventMonitoring } from './APIEventHelper.js'
import { getCameraSummaryList } from './APICameraHelper.js'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:monitor')

// Receive a reference to the server socket.io instance
export async function setSocketServer (serverSocket) {
  // Install camera event monitoring
  debug('Setting up camera event monitoring')
  setupEventMonitoring((eventName, ...args) => {
    switch (eventName) {
      case camAPI.CameraBrowser.EventName.CameraAdd:
      case camAPI.CameraBrowser.EventName.CameraRemove:
        debug('Relaying updated camera list')
        serverSocket.emit('CameraList', getCameraSummaryList())
        break
    }
  }, 500, debug)
}

// Example client message listening (we may not need anything here)
export function setupSocketClient (clientSocket) {
  // Respond to messages from clients
  clientSocket.on('message', messageListener.bind(clientSocket))
}

// 'this' is the socket inside the listener functions
function messageListener () {
}
