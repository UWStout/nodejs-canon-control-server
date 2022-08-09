import ESPER from 'esper-photo-control'
import CameraAPIError from '../RESTApi/CameraAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'ESPER_SDK')

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
    const triggerBox = new ESPER.TriggerBox(PORT_PATH)
    triggerBox.on('ready', async () => {
      // Print connection string
      log.info(`[${PORT_PATH}] Connected to trigger box ${triggerBox.boxId} in ${triggerBox.mode} mode`)

      try {
        // Pause a bit before sending commands
        await ESPER.waitForMilliseconds(1000)

        // Enable link
        log.info(`[${PORT_PATH}] Enabling link ...`)
        await triggerBox.enableLink(true)

        // Focus and fire
        log.info(`[${PORT_PATH}] Starting focus ...`)
        await triggerBox.startFocus(1000)

        log.info(`[${PORT_PATH}] Releasing shutter ...`)
        await triggerBox.releaseShutter()

        log.info(`[${PORT_PATH}] Releasing focus ...`)
        await triggerBox.stopFocus()

        // Close the connection
        log.info(`[${PORT_PATH}] Shutting down ...`)
        await triggerBox.close()
      } catch (error) {
        triggerBox.close()
        log.error('Box command failed:')
        throw new CameraAPIError(500, null, 'Box command failed', { cause: error })
      }
    })
  } catch (error) {
    log.error('Trigger failed')
    throw new CameraAPIError(500, null, 'Failed to trigger camera', { cause: error })
  }
}
