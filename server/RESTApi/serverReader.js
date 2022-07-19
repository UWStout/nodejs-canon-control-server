// Basic HTTP routing library
import Express from 'express'

import { getSessions } from '../util/fileHelper.js'
import { getCapturePath } from './cameraMonitor.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'main-read')

// Create a router to attach to an express server app
const router = new Express.Router()
log.info('Server Reader Routes Active')

// ******* Reading routes **************

router.get('/capture/current', (req, res) => {
  try {
    const capturePath = getCapturePath()
    return res.send({
      success: true,
      capturePath
    })
  } catch (err) {
    return res.send({ error: true })
  }
})

router.get('/sessions', (req, res) => {
  try {
    const result = getSessions()
    return res.send(result)
  } catch (err) {
    return res.send({ error: true })
  }
})

export default router
