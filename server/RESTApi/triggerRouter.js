// Basic HTTP routing library
import Express from 'express'

// Special Error handling object
import CameraAPIError from './CameraAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
import { listPossibleBoxes, takePhoto, primeTrigger, fireTrigger, unPrimeTrigger } from '../esperSDK/triggerBoxSDK.js'
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

router.post('/:index/prime', async (req, res) => {
  if (isNaN(parseInt(req.params.index))) {
    return res.status(400).json({ error: true, message: 'Bad trigger box index' })
  }

  try {
    await primeTrigger(parseInt(req.params.index))
    return res.json({ success: true })
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

router.post('/fire', async (req, res) => {
  try {
    await fireTrigger()
    return res.json({ success: true })
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

router.post('/flush', async (req, res) => {
  try {
    await unPrimeTrigger()
    return res.json({ success: true })
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

router.post('/:index/focus', async (req, res) => {
  if (isNaN(parseInt(req.params.index))) {
    return res.status(400).json({ error: true, message: 'Bad trigger box index' })
  }

  try {
    await takePhoto(parseInt(req.params.index), true)
    return res.status(202).json({ success: true })
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

router.post('/:index/takePhoto', async (req, res) => {
  if (isNaN(parseInt(req.params.index))) {
    return res.status(400).json({ error: true, message: 'Bad trigger box index' })
  }

  try {
    await takePhoto(parseInt(req.params.index))
    return res.status(202).json({ success: true })
  } catch (e) {
    CameraAPIError.respond(e, res, log)
  }
})

export default router
