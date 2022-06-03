// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:monitor')

// Receive a reference to the server socket.io instance
export async function setSocketServer (serverSocket) {
  // Install camera event monitoring
  debug('Setting up camera event monitoring')
  camAPI.cameraBrowser.setEventHandler((eventName, ...args) => {
    debug('CAM_API event:', eventName, args)
    serverSocket.emit(eventName, args)
  })

  // Initiate watching for camera events
  try {
    camAPI.watchCameras()
    debug('Awaiting camera events')
  } catch (e) {
    debug('Error watching for camera events:', e)
  }
}

export function setupSocketClient (clientSocket) {
  // Respond to messages from clients
  clientSocket.on('message', messageListener.bind(clientSocket))
}

// 'this' is the socket inside the listener functions
function messageListener () {
}
