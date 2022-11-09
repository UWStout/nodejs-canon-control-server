// Basic HTTP routing library
import Express from 'express'

import { getCaptureMode, getDownloadPath, getFilenameSuffix, getSessions } from '../util/fileHelper.js'
import { getLiveViewTimeout } from './liveViewSocketStreamer.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'main-read')

// Create a router to attach to an express server app
const router = new Express.Router()
log.info('Server Reader Routes Active')

// ******* Reading routes **************

router.get('/capture/mode', (req, res) => {
  try {
    const captureMode = getCaptureMode()
    return res.send(captureMode)
  } catch (err) {
    return res.status(500).send({ error: true })
  }
})

router.get('/capture/current', (req, res) => {
  try {
    const capturePath = getDownloadPath()
    return res.send(capturePath)
  } catch (err) {
    return res.status(500).send({ error: true })
  }
})

router.get('/fileSuffix/current', (req, res) => {
  try {
    const filenameSuffix = getFilenameSuffix()
    return res.send(filenameSuffix)
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
    return res.send({ timeout })
  } catch (err) {
    return res.status(500).send({ error: true })
  }
})

router.get('/ping', (req, res) => {
  return res.send({ pong: true })
})

export default router
