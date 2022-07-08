import fs from 'fs'

// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

// API Helper interface
import { setupEventMonitoring } from '../camSDK/SDKEventHelper.js'
import { getCameraSummaryList, portList, SNList } from '../camSDK/SDKCameraHelper.js'

// Setup logging
import dotenv from 'dotenv'
import { makeLogger } from '../util/logging.js'
import { info } from 'console'
const log = makeLogger('server', 'monitor')

// Update environment variables
dotenv.config()
const HOST_NICKNAME = process.env.HOST_NICKNAME || 'nickname'
const HOST_NAME = process.env.HOST_NAME || 'localhost'
const DEV_PORT = process.env.DEV_PORT || 3000
const PROD_PORT = process.env.PROD_PORT || 42424

// Read list of camera nicknames into array
const rawData = fs.readFileSync(
  './server/RESTApi/CameraNicknames.json',
  { encoding: 'utf8' }
)
const camNicknames = JSON.parse(rawData)

// Store local copy of server socket
let lastServerSocket = null

// Start out disabled, needs to be enabled once
let serverEnabled = false

export function enableSocketServer (enable) {
  // Update enabled state
  serverEnabled = enable

  // When enabling, send latest camera list
  if (serverEnabled && lastServerSocket) {
    log.verbose('Relaying updated camera list')
    lastServerSocket.emit('CameraList', getCameraSummaryList())
  }
}

// Receive a reference to the server socket.io instance
export function setSocketServer (serverSocket) {
  lastServerSocket = serverSocket
  if (serverSocket) {
    // Install camera event monitoring
    log.info('Setting up camera event monitoring')
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
          log.info(`Download request: camera ${camIndex}, ${file?.name}`)
          if (file?.format.value === camAPI.FileFormat.ID.JPEG) {
            const serial = SNList[camIndex]
            const nickname = camNicknames.find( pair => pair.SN == serial ).nickname
            let camName
            if (!nickname)
            {
              camName = `CAM_${nickname}`
            }
            else
            {
              camName = `SN_${serial}`
            }

            const imgData = file?.downloadThumbnailToString()
            const imgBuffer = Buffer.from(imgData, 'base64')
            fs.writeFileSync(`./public/images/SUB_${HOST_NICKNAME}_${camName}_${file?.name}`, imgBuffer, { encoding: 'utf8' })
          }
          break

        case camAPI.CameraBrowser.EventName.StateChange:
          log.verbose(`State change: camera ${camIndex} ${stateEvent.toString()}`)
          break

        case camAPI.CameraBrowser.EventName.PropertyChangeValue:
          log.verbose(`Property value change: camera ${camIndex} ${property.label}`)
          break

        case camAPI.CameraBrowser.EventName.PropertyChangeOptions:
          log.verbose(`Property options change: camera ${camIndex} ${property.label}`)
          break

        case camAPI.CameraBrowser.EventName.CameraAdd:
        case camAPI.CameraBrowser.EventName.CameraRemove: {
          log.verbose('Relaying updated camera list')
          const camList = getCameraSummaryList()
          serverSocket.emit('CameraList', camList)
        } break
      }
    }, 500, log)
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
