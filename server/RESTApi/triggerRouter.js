// Basic HTTP routing library
import Express from 'express'

import CameraAPIError from './CameraAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
import { listPossibleBoxes, releaseShutter } from '../esperSDK/triggerBoxSDK.js'
const log = makeLogger('server', 'trigger')

// Create a router to attach to an express server app
const router = new Express.Router()
log.info('Trigger Routes Active')

router.get('/', async (req, res) => {
  log.info('sending camera summary list')
  try {
    const triggerBoxes = await listPossibleBoxes()
    return res.json(triggerBoxes)
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

router.post('/:index/release', async (req, res) => {
  if (isNaN(parseInt(req.params.index))) {
    return res.status(400).json({ error: true, message: 'Bag trigger box index' })
  }

  try {
    await releaseShutter(parseInt(req.params.index))
    return res.json({ success: true })
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

export default router
