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
let countdownCallback = null
let timeoutDelay = 60000
let timeoutCountdown = 0

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
    timeoutCountdown = timeoutDelay
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

  // Setup countdown to timeout live view 
  countdownCallback = setInterval(() => {
      // Tick counter down
      timeoutCountdown = timeoutCountdown - 1000
      // Stop live view and emit timeout signal if timeoutCountdown is below 0 and timeoutDelay is greater than 0
      // timeoutDelay of 0 indicates 'Never'
      if (timeoutCountdown < 0 && timeoutDelay > 0) {
        mySocket.emit('LiveViewTimeout', {
          message: `Live View Timed Out`,
          timeoutDelay
        })
        stopLiveView()
      }
    },
    1000
  )

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

  // Clear timeout countdown
  if (countdownCallback !== null) {
    clearInterval(countdownCallback)
    countdownCallback = null
  }

  // Stop live view
  if (currentCamera) {
    currentCamera.stopLiveView()
    currentCamera = null
  }

  // Clear the index
  currentCameraIndex = -1
}

// Return the current live view timeout
export function getLiveViewTimeout() {
  return timeoutDelay
}

// Change the live view timeout and reset the countdown
export function setLiveViewTimeout(timeout) {
  timeoutDelay = timeout
  timeoutCountdown = timeout
}
