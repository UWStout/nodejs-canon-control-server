// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'

const POLLING_INTERVAL_MS = 100

export function setupEventMonitoring (eventCallback, debug = console.error) {
  // Set event callback
  camAPI.cameraBrowser.setEventHandler(eventCallback)

  // Initiate watching for camera events
  try {
    camAPI.cameraBrowser.getCameras()
    camAPI.watchCameras(POLLING_INTERVAL_MS)
    debug('Awaiting camera events')
  } catch (e) {
    debug('Error watching for camera events:', e)
  }
}
