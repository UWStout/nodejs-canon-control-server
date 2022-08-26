import path from 'path'

// Temporary file name generation library
import { temporaryWriteTask } from 'tempy'

// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

// API Helper interface
import { setupEventMonitoring } from '../camSDK/SDKEventHelper.js'
import { getCameraNickname, getCameraSummaryList, portList } from '../camSDK/SDKCameraHelper.js'
import { getDownloadPath, getFilenameSuffix, getImageInfoFromFile } from '../util/fileHelper.js'
import { downloadImgThreaded } from '../threading/workerController.js'
import { setLiveViewCamera, stopLiveView } from './liveViewSocketStreamer.js'

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

// Coordinate retrieving the exposure info
let grabExposureInfo = false
let exposureInfoCB = null

export function prepareToReceiveExposureInfo (callback) {
  grabExposureInfo = true
  exposureInfoCB = callback
}

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
          if (grabExposureInfo) {
            grabExposureInfo = false
            log.info(`Exposure Info request: camera ${camIndex}`)

            // Download image data and save to temporary file
            const imgData = file.downloadThumbnailToString()
            const imgBuffer = Buffer.from(imgData, 'base64')

            // Save to temp file and extract exposure info
            temporaryWriteTask(imgBuffer, async tempFilePath => {
              try {
                const exposureInfo = await getImageInfoFromFile(tempFilePath)
                exposureInfoCB(exposureInfo)
              } catch (error) {
                log.error('Failed to read exposure info')
                exposureInfoCB({ error: true, message: error.message })
              }
            }, { encoding: 'utf8' })
          } else {
            log.info(`Download request: camera ${camIndex}, ${file?.name}`)

            // Expect JPEG and CR2 raw files
            if (file?.format.value === camAPI.FileFormat.ID.JPEG || file?.format.value === camAPI.FileFormat.ID.CR2) {
              // Prepare filename
              const suffix = getFilenameSuffix()
              const camName = getCameraNickname(camIndex)
              const fileExt = (file?.format.value === camAPI.FileFormat.ID.JPEG) ? '.jpg' : '.cr2'
              const imgName = `${camName}_${HOST_NICKNAME}${suffix ? '_' + suffix : ''}${path.extname(file.name)?.toLowerCase() || fileExt}`

              // Send start signal via sockets
              try {
                serverSocket
                  .to(['Download-*', `Download-${camIndex}`])
                  .emit('DownloadStart', { camIndex, filename: imgName })
              } catch (error) {
                log.error('Socket error (downloadStart):', error)
              }

              // Get image from camera & generate filename
              const imgData = file.downloadThumbnailToString()
              const fullFilePath = path.join(DOWNLOAD_DIR, getDownloadPath(), imgName)

              // setup callback for completion signal with exposure info via sockets
              const downloadCompleteCallback = async (data) => {
                try {
                  // Retrieve Exposure info from file
                  const exposureInfo = await getImageInfoFromFile(data.filePath)
                  serverSocket
                    .to(['Download-*', `Download-${camIndex}`])
                    .emit('DownloadEnd', { camIndex, exposureInfo, filename: imgName })
                } catch (error) {
                  log.error('Socket error (downloadEnd):', error)
                }
              }

              // Send Image to Worker Queue for download
              const imgBuffer = Buffer.from(imgData, 'base64')
              downloadImgThreaded(imgBuffer, fullFilePath, downloadCompleteCallback)
            }
          }
          break

        case camAPI.CameraBrowser.EventName.StateChange:
          log.verbose(`State change: camera ${camIndex} ${JSON.stringify(stateEvent.toJSON())}`)
          try {
            serverSocket
              .to(['CameraState-*', `CameraState-${camIndex}`])
              .emit('CameraState', { camIndex, camNickname: getCameraNickname(camIndex), ...stateEvent.toJSON() })
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
        case camAPI.CameraBrowser.EventName.CameraRemove:
          log.info('Relaying updated camera list')
          try {
            const camList = getCameraSummaryList()
            serverSocket.to('CameraList').emit('CameraListUpdate', camList)
          } catch (error) {
            log.error('Camera list relay error:', error)
          }
          break
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

  // Live View Messages
  clientSocket.on('setLiveViewCamera', cameraIndex => {
    setLiveViewCamera(cameraIndex, lastServerSocket, clientSocket)
  })

  clientSocket.on('stopLiveView', () => {
    stopLiveView()
  })
}
