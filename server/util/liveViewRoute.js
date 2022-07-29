import EventEmitter from 'events'

import camAPI from '@dimensional/napi-canon-cameras'
import MJPEGReqHandler from './MJPEGServer.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'liveView')

// How frequently to check for Live View images (defaults to approx. 24fps)
const IMAGE_INTERVAL_TIME = 5

// Setup event watching for EDSDK
const events = new EventEmitter()
events.on(
  camAPI.CameraBrowser.EventName.LiveViewStart,
  e => console.log('LV Started', e)
)

events.on(
  camAPI.CameraBrowser.EventName.LiveViewStop,
  e => console.log('LV Stopped', e)
)

// Watch for EDSDK API events
camAPI.cameraBrowser.setEventHandler(
  (eventName, ...args) => events.emit(eventName, ...args)
)
camAPI.watchCameras()

// Reference to the currently active MJPEGHandler and camera (if any)
let currentHandler = null
let currentCamera = null
let intervalCallback = null

// Release resources and stop live view mode and stream
export function stopLiveView () {
  // Stop the image pump
  if (intervalCallback !== null) {
    clearInterval(intervalCallback)
    intervalCallback = null
  }

  // Stop MJPEG stream
  if (currentHandler) {
    currentHandler.close()
    currentHandler = null
  }

  // Stop live view
  if (currentCamera) {
    currentCamera.stopLiveView()
    currentCamera = null
  }
}

// Canon LiveView express middleware
// - If your route contains a parameter ':index' the camera at that index will be used
export function expressLiveView (req, res) {
  // Only one stream can be active at a time
  if (currentCamera !== null) {
    return res.status(405).send('Multiple streams not supported')
  }

  // Read the camera index from the route params
  const cameraIndex = parseInt(req.params.index) || 0

  // Attempt to find and connect to camera
  const camera = camAPI.cameraBrowser.getCamera(cameraIndex)
  if (!camera) {
    return res.status(404).send('Camera not found')
  }

  camera.connect()

  // Attempt to start liveview
  if (!camera.getProperty(camAPI.CameraProperty.ID.Evf_Mode).available) {
    return res.status(423).send('Live View not Available')
  }

  // Setup current camera ref and start live view
  currentCamera = camera
  log.info(`Starting live view for ${cameraIndex}`)
  camera.startLiveView()

  // Setup the MJPEG handler
  const MJPEGHandler = new MJPEGReqHandler(res)
  currentHandler = MJPEGHandler

  // Read and pass the JPEGS along
  intervalCallback = setInterval(
    () => {
      try {
        const imageData = camera.downloadLiveViewImage()
        MJPEGHandler.writeBuffer(Buffer.from(imageData, 'base64'), (err) => {
          log.error('Error writing liveView data:', err)
        })
      } catch (e) {
        if (!e.message.includes('OBJECT_NOTREADY')) {
          log.error('LiveView image download error:', e.message)
        }
      }
    },
    IMAGE_INTERVAL_TIME
  )

  // Stop streaming when request closes or ends
  req.on('close', stopLiveView)
  req.on('end', stopLiveView)
}
