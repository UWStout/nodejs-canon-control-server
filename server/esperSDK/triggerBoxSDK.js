import ESPER from 'esper-photo-control'
import CameraAPIError from '../RESTApi/CameraAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'ESPER_SDK')

// Store local copy of server socket
let lastServerSocket = null

// Receive a reference to the server socket.io instance
export function setSocketServer (serverSocket) {
  lastServerSocket = serverSocket
}

function sendSocketMessage (boxIndex, type) {
  if (lastServerSocket) {
    try {
      lastServerSocket
        .to(['TriggerBox-*', `TriggerBox-${boxIndex}`])
        .emit('TriggerBoxEvent', { boxIndex, type })
    } catch (error) {
      log.error('Socket error (triggerBox):', error)
    }
  }
}

export async function listPossibleBoxes () {
  try {
    const boxes = await ESPER.listPossibleTriggerBoxes()
    return boxes
  } catch (error) {
    throw new CameraAPIError(500, null, 'Error listing trigger boxes', { cause: error })
  }
}

export async function releaseShutter (index) {
  let PORT_PATH = ''

  sendSocketMessage(index, 'release:starting')
  try {
    const boxes = await ESPER.listPossibleTriggerBoxes()
    if (!Array.isArray(boxes) || boxes.length <= index) {
      throw new CameraAPIError(404, null, 'Box index not found')
    }
    PORT_PATH = boxes[index]
  } catch (error) {
    log.error('Trigger listing failed')
    throw new CameraAPIError(500, null, 'Error listing trigger boxes', { cause: error })
  }

  try {
    sendSocketMessage(index, 'release:connecting')
    const triggerBox = new ESPER.TriggerBox(PORT_PATH)
    triggerBox.on('ready', async () => {
      // Print connection string
      log.info(`[${PORT_PATH}] Connected to trigger box ${triggerBox.boxId} in ${triggerBox.mode} mode`)

      try {
        // Pause a bit before sending commands
        sendSocketMessage(index, 'release:configuring')
        await ESPER.waitForMilliseconds(1000)

        // Enable link
        log.info(`[${PORT_PATH}] Enabling link ...`)
        await triggerBox.enableLink(true)

        // Focus and fire
        sendSocketMessage(index, 'release:focusing')
        log.info(`[${PORT_PATH}] Starting focus ...`)
        await triggerBox.startFocus(2000)

        sendSocketMessage(index, 'release:firing')
        log.info(`[${PORT_PATH}] Releasing shutter ...`)
        await triggerBox.releaseShutter()

        sendSocketMessage(index, 'release:cleanup')
        log.info(`[${PORT_PATH}] Releasing focus ...`)
        await triggerBox.stopFocus()

        // Close the connection
        log.info(`[${PORT_PATH}] Shutting down ...`)
        await triggerBox.close()

        sendSocketMessage(index, 'release:complete')
      } catch (error) {
        triggerBox.close()
        sendSocketMessage(index, 'release:error')
        log.error('Box command failed:')
        throw new CameraAPIError(500, null, 'Box command failed', { cause: error })
      }
    })
  } catch (error) {
    log.error('Trigger failed')
    throw new CameraAPIError(500, null, 'Failed to trigger camera', { cause: error })
  }
}
