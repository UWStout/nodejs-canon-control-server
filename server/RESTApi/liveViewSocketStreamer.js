import camAPI from '@dimensional/napi-canon-cameras'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'lvSocket')

// How frequently to check for Live View images (defaults to approx. 24fps)
const IMAGE_INTERVAL_TIME = 5

// Time to wait when stopping a live view
const WAIT_FOR_STOP = 1000

// Current live view state
let currentCameraIndex = -1
let currentCamera = null
let intervalCallback = null

export async function setLiveViewCamera (cameraIndex, mySocket, clientSocket) {
  // Is this a change of state at all?
  if (cameraIndex === currentCameraIndex) {
    return
  } else {
    // Stop any active live view before continuing
    if (currentCameraIndex >= 0) {
      stopLiveView()
      await new Promise(resolve => setInterval(() => resolve(), WAIT_FOR_STOP))
    }
  }

  // Attempt to find and connect to camera
  const camera = camAPI.cameraBrowser.getCamera(cameraIndex)
  if (!camera) { throw new Error('Camera not found') }
  camera.connect()

  // Attempt to start live view
  if (!camera.getProperty(camAPI.CameraProperty.ID.Evf_Mode).available) {
    throw new Error('Live View not Available')
  }

  currentCamera = camera
  currentCameraIndex = cameraIndex
  startLiveView(mySocket)
}

function startLiveView (mySocket) {
  // Setup current camera ref and start live view
  log.info(`Starting live view for ${currentCameraIndex}`)
  try {
    currentCamera.startLiveView()
  } catch (err) {
    log.error('Live view failed to start')
    log.error(err)
    mySocket.emit('LiveViewError', {
      message: `Failed to start live view on ${currentCameraIndex}`,
      error: err
    })

    // Clear live view state
    currentCamera = null
    stopLiveView()
    return
  }

  // Read and pass the JPEGS along
  intervalCallback = setInterval(
    () => {
      try {
        const imageData = currentCamera.downloadLiveViewImage()
        mySocket.volatile.emit('LiveViewImage', { currentCameraIndex, imageData })
      } catch (e) {
        if (!e.message.includes('OBJECT_NOTREADY')) {
          log.error('LiveView image download error:', e.message)
          stopLiveView()
        }
      }
    },
    IMAGE_INTERVAL_TIME
  )
}

export async function stopLiveView () {
  // Stop the image pump
  if (intervalCallback !== null) {
    log.info('Stopping live view')
    clearInterval(intervalCallback)
    intervalCallback = null
  }

  // Stop live view
  if (currentCamera) {
    currentCamera.stopLiveView()
    currentCamera = null
  }

  // Clear the index
  currentCameraIndex = -1
}