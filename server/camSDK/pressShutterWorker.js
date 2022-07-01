import camSDK from '@dimensional/napi-canon-cameras'

import { workerData, parentPort } from 'worker_threads'

// Extract parameter data
const { index, pressType } = workerData
if (typeof index !== 'number' || typeof pressType !== 'number') {
  throw new Error('Invalid parameters')
}

// Retrieve camera and connect
const cam = new camSDK.Camera(index)
cam.connect()

// Press and then release the shutter
cam.sendCommand(camSDK.Camera.Command.PressShutterButton, pressType)
cam.sendCommand(camSDK.Camera.Command.PressShutterButton, camSDK.Camera.PressShutterButton.OFF)

// Report success
parentPort.postMessage({ success: true })
