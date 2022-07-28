import fs from 'fs'
import path from 'path'

// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

// API Helper interface
import { setupEventMonitoring } from '../camSDK/SDKEventHelper.js'
import { getCameraSummaryList, portList, SNList } from '../camSDK/SDKCameraHelper.js'
import { getCameraNicknames, getDownloadPath } from '../util/fileHelper.js'

// Setup logging and environment variables
import { makeLogger } from '../util/logging.js'

import dotenv from 'dotenv'

// Update environment variables
dotenv.config()
const HOST_NICKNAME = process.env.HOST_NICKNAME || 'nickname'
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './public/images'

// Create logger
const log = makeLogger('server', 'monitor')

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
    try {
      lastServerSocket.emit('CameraList', getCameraSummaryList())
    } catch (error) {
      log.error('Socket error (enableSocketServer):', error)
    }
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
            // Send start signal via sockets
            try {
              serverSocket
                .to(['Download-*', `Download-${camIndex}`])
                .emit('DownloadStart', { camIndex, filename: file?.name })
            } catch (error) {
              log.error('Socket error (downloadStart):', error)
            }

            // Download file
            const serial = SNList[camIndex]
            const nickname = getCameraNicknames()[serial]
            const camName = (nickname) || `SN_${serial}`
            const imgData = file?.downloadThumbnailToString()
            const imgBuffer = Buffer.from(imgData, 'base64')
            const imgName = `SUB_${HOST_NICKNAME}_${camName}_${file?.name}`
            fs.writeFileSync(
              path.join(DOWNLOAD_DIR, getDownloadPath(), imgName),
              imgBuffer,
              { encoding: 'utf8' }
            )

            // Send completion signal via sockets
            try {
              serverSocket
                .to(['Download-*', `Download-${camIndex}`])
                .emit('DownloadEnd', { camIndex, filename: file?.name })
            } catch (error) {
              log.error('Socket error (downloadEnd):', error)
            }
          }
          break

        case camAPI.CameraBrowser.EventName.StateChange:
          log.verbose(`State change: camera ${camIndex} ${stateEvent.toString()}`)
          try {
            serverSocket
              .to(['CameraState-*', `CameraState-${camIndex}`])
              .emit('CameraState', stateEvent.toString())
          } catch (error) {
            log.error('Socket error (cameraState):', error)
          }
          break

        case camAPI.CameraBrowser.EventName.PropertyChangeValue:
          log.verbose(`Property value change: camera ${camIndex} ${property.label}`)
          try {
            serverSocket
              .to(['CameraPropertyValue-*', `CameraPropertyValue-${camIndex}`])
              .emit('CameraPropertyValue', { label: property.label })
          } catch (error) {
            log.error('Socket error (propertyValue):', error)
          }
          break

        case camAPI.CameraBrowser.EventName.PropertyChangeOptions:
          log.verbose(`Property options change: camera ${camIndex} ${property.label}`)
          try {
            serverSocket
              .to(['CameraPropertyOptions-*', `CameraPropertyOptions-${camIndex}`])
              .emit('CameraPropertyOptions', { label: property.label })
          } catch (error) {
            log.error('Socket error (propertyOptions):', error)
          }
          break

        case camAPI.CameraBrowser.EventName.CameraAdd:
        case camAPI.CameraBrowser.EventName.CameraRemove: {
          log.info('Relaying updated camera list')
          const camList = getCameraSummaryList()
          try {
            serverSocket.to('CameraList').emit('CameraListUpdate', camList)
          } catch (error) {
            log.error('Socket error (cameraList):', error)
          }
        } break
      }
    }, 500, log)
  }
}

// Example client message listening (we may not need anything here)
export function setupSocketClient (clientSocket) {
  // Respond to messages from clients
  clientSocket.on('subscribe', eventList => {
    eventList.forEach(eventName => clientSocket.join(eventName))
  })

  clientSocket.on('unsubscribe', eventList => {
    eventList.forEach(eventName => clientSocket.leave(eventName))
  })
}
