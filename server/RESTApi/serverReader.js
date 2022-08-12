// Basic HTTP routing library
import Express from 'express'

import { getDownloadPath, getSessions } from '../util/fileHelper.js'
import { getLiveViewTimeout } from './liveViewSocketStreamer.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'main-read')

// Create a router to attach to an express server app
const router = new Express.Router()
log.info('Server Reader Routes Active')

// ******* Reading routes **************

router.get('/capture/current', (req, res) => {
  try {
    const capturePath = getDownloadPath()
    return res.send(capturePath)
  } catch (err) {
    return res.status(500).send({ error: true })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    const result = await getSessions()
    return res.send(result)
  } catch (error) {
    return res.status(500).send({ error: true, message: error.message })
  }
})

router.get('/liveview/timeout', (req, res) => {
  try {
    const timeout = getLiveViewTimeout()
    log.info(`Retrieved Timeout: ${timeout}`)
    return res.send({timeout})
  } catch (err) {
    return res.status(500).send({ error: true })
  }
})

export default router
