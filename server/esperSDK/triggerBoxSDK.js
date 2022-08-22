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

// Currently primed trigger box info
let primedPortPath = ''
let primedIndex = -1
let primedTriggerBox = null

export async function primeTrigger (index) {
  let PORT_PATH = ''

  sendSocketMessage(index, 'prime:starting')
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
    sendSocketMessage(index, 'prime:connecting')
    const triggerBox = new ESPER.TriggerBox(PORT_PATH)
    triggerBox.on('ready', async () => {
      // Print connection string
      log.info(`[${PORT_PATH}] Connected to trigger box ${triggerBox.boxId} in ${triggerBox.mode} mode`)
      primedPortPath = PORT_PATH
      primedTriggerBox = triggerBox
      primedIndex = index

      try {
        // Pause a bit before sending commands
        sendSocketMessage(index, 'prime:configuring')
        await ESPER.waitForMilliseconds(1000)

        // Enable link
        log.info(`[${PORT_PATH}] Enabling link ...`)
        await triggerBox.enableLink(true)

        // Focus and fire
        sendSocketMessage(index, 'prime:focusing')
        log.info(`[${PORT_PATH}] Starting focus ...`)
        await primedTriggerBox.startFocus(2000)

        log.info(`[${PORT_PATH}] Primed and Ready`)
        sendSocketMessage(index, 'prime:complete')
      } catch (error) {

      }
    })
  } catch (error) {
    primedTriggerBox.close()
    primedTriggerBox = null

    sendSocketMessage(primedIndex, 'prime:error')
    log.error('Box priming failed:', error.message)
    throw new CameraAPIError(500, null, 'Box prime failed', { cause: error })
  }
}

export async function fireTrigger () {
  if (!primedTriggerBox) {
    throw new CameraAPIError(400, null, 'Must prime trigger first')
  }

  try {
    sendSocketMessage(primedIndex, 'fire:firing')
    log.info(`[${primedPortPath}] Releasing shutter ...`)
    await primedTriggerBox.releaseShutter()

    sendSocketMessage(primedIndex, 'fire:complete')
  } catch (error) {
    primedTriggerBox.close()
    primedTriggerBox = null

    sendSocketMessage(primedIndex, 'fire:error')
    log.error('Box fire failed:', error.message)
    throw new CameraAPIError(500, null, 'Box fire failed', { cause: error })
  }
}

export async function unPrimeTrigger () {
  // Ignore un-prime requests if nothing is primed
  if (!primedTriggerBox) {
    return
  }

  try {
    sendSocketMessage(primedIndex, 'flush:cleanup')
    log.info(`[${primedPortPath}] Releasing focus ...`)
    await primedTriggerBox.stopFocus()

    // Close the connection
    log.info(`[${primedPortPath}] Shutting down ...`)
    await primedTriggerBox.close()

    primedTriggerBox = null
    sendSocketMessage(primedIndex, 'flush:complete')
  } catch (error) {
    primedTriggerBox.close()
    primedTriggerBox = null

    sendSocketMessage(primedIndex, 'flush:error')
    log.error('Box flush failed:', error.message)
    throw new CameraAPIError(500, null, 'Box flush failed', { cause: error })
  }
}

export async function takePhoto (index, focusOnly = false) {
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

        if (!focusOnly) {
          sendSocketMessage(index, 'release:firing')
          log.info(`[${PORT_PATH}] Releasing shutter ...`)
          await triggerBox.releaseShutter()
        }

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
