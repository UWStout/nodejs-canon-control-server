import fs from 'fs'

// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

// API Helper interface
import { setupEventMonitoring } from './APIEventHelper.js'
import { getCameraSummaryList, portList } from './APICameraHelper.js'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:monitor')

// Store local copy of server socket
let lastServerSocket = null

// Start out disabled, needs to be enabled once
let serverEnabled = false

export function enableSocketServer (enable) {
  // Update enabled state
  serverEnabled = enable

  // When enabling, send latest camera list
  if (serverEnabled && lastServerSocket) {
    debug('Relaying updated camera list')
    lastServerSocket.emit('CameraList', getCameraSummaryList())
  }
}

// Receive a reference to the server socket.io instance
export function setSocketServer (serverSocket) {
  lastServerSocket = serverSocket
  if (serverSocket) {
    // Install camera event monitoring
    debug('Setting up camera event monitoring')
    setupEventMonitoring((eventName, ...args) => {
      if (!serverEnabled) { return }

      // Extract possible event properties
      const camera = (args[0]?.camera || null)
      const camIndex = (camera ? portList.findIndex(port => port === camera.portName) : -1)
      const property = (args[0]?.property || null)
      const file = (args[0]?.file || null)
      const stateEvent = (args[0]?.stateEvent || null)

      // Switch on the type of event
      switch (eventName) {
        case camAPI.CameraBrowser.EventName.DownloadRequest:
          debug('Download request: camera', camIndex, file?.name)
          if (file?.format.value === camAPI.FileFormat.ID.JPEG) {
            const imgData = file?.downloadThumbnailToString()
            fs.writeFileSync(`./public/images/${file?.name}`, imgData, { encoding: 'utf8' })
          }
          break

        case camAPI.CameraBrowser.EventName.StateChange:
          // debug('State change: camera', camIndex, stateEvent)
          break

        case camAPI.CameraBrowser.EventName.PropertyChangeValue:
          // debug('Property value change: camera', camIndex, property)
          break

        case camAPI.CameraBrowser.EventName.PropertyChangeOptions:
          // debug('Property options change: camera', camIndex, property)
          break

        case camAPI.CameraBrowser.EventName.CameraAdd:
        case camAPI.CameraBrowser.EventName.CameraRemove: {
          debug('Relaying updated camera list')
          const camList = getCameraSummaryList()
          serverSocket.emit('CameraList', camList)
        } break
      }
    }, 500, debug)
  }
}

// Example client message listening (we may not need anything here)
export function setupSocketClient (clientSocket) {
  // Respond to messages from clients
  clientSocket.on('subscribe', subscribeListener.bind(clientSocket))
}

// 'this' is the socket inside the listener functions
function subscribeListener (message) {
}
