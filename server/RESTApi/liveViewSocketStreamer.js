import camAPI from '@dimensional/napi-canon-cameras'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'lvSocket')

// How frequently to check for Live View images (defaults to approx. 24fps)
const IMAGE_INTERVAL_TIME = 5

// Reference to the currently active live view camera (if any)
let currentCamera = null
let intervalCallback = null

export async function startLiveView (cameraIndex, mySocket, clientSocket) {
  // Attempt to find and connect to camera
  const camera = camAPI.cameraBrowser.getCamera(cameraIndex)
  if (!camera) { throw new Error('Camera not found') }
  camera.connect()

  // Attempt to start live view
  if (!camera.getProperty(camAPI.CameraProperty.ID.Evf_Mode).available) {
    throw new Error('Live View not Available')
  }

  // Setup current camera ref and start live view
  currentCamera = camera
  log.info(`Starting live view for ${cameraIndex}`)
  camera.startLiveView()

  // Read and pass the JPEGS along
  intervalCallback = setInterval(
    () => {
      try {
        const imageData = camera.downloadLiveViewImage()
        mySocket.to(clientSocket).emit('LiveViewImage', { cameraIndex, imageData })
      } catch (e) {
        if (!e.message.includes('OBJECT_NOTREADY')) {
          log.error('LiveView image download error:', e.message)
        }
      }
    },
    IMAGE_INTERVAL_TIME
  )
}

export async function stopLiveView () {
  // Stop the image pump
  if (intervalCallback !== null) {
    clearInterval(intervalCallback)
    intervalCallback = null
  }

  // Stop live view
  if (currentCamera) {
    currentCamera.stopLiveView()
    currentCamera = null
  }
}
