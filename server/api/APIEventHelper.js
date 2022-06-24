// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

const POLLING_INTERVAL_MS = 100

export function setupEventMonitoring (eventCallback, updateCameraList = 0, log = console) {
  // Set event callback
  camAPI.cameraBrowser.setEventHandler(eventCallback)

  // Initiate watching for camera events
  try {
    camAPI.cameraBrowser.getCameras()
    camAPI.watchCameras(POLLING_INTERVAL_MS)
    log.info('Awaiting camera events')
  } catch (e) {
    log.error('Error watching for camera connect/disconnect events:', e.message)
  }

  // Initiate periodic polling to update camera list
  if (updateCameraList) {
    setTimeout(() => camAPI.cameraBrowser.update(), updateCameraList)
  }
}

export function monitorCamera (camIndex, eventCallback, log = console) {
  // Initiate watching for camera events
  try {
    const curCam = new camAPI.Camera(camIndex)
    curCam.setEventHandler(eventCallback)
  } catch (e) {
    log.error('Error watching for camera events:', e.message)
  }
}
