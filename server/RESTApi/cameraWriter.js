// Basic HTTP routing library
import Express from 'express'

import {
  setCameraProperty,
  takePicture,
  pressShutterButton,
  setCameraProperties
  // computeTZValue
} from '../camSDK/SDKCameraHelper.js'

import CameraAPIError from './CameraAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'writer')

// Create a router to attach to an express server app
const router = new Express.Router()

// Install JSON body parser for all these routes
router.use(Express.json())
log.info('Camera Writer Routes Active')

function validateIndex (req, message = 'Writing') {
  const index = parseInt(req.params.index)
  if (req.params.index === '*') {
    log.info(`${message} for ALL cameras`)
  } else if (!isNaN(index)) {
    log.info(`${message} for camera ${index}`)
  } else {
    throw new CameraAPIError(400, null, 'Invalid index type. Must be an integer or *')
  }

  return index
}

// ******* API Camera Writing routes **************
router.post('/:index/trigger', async (req, res) => {
  try {
    const index = validateIndex(req, 'Taking picture')
    const results = await takePicture(isNaN(index) ? '*' : index)
    return res.send({ status: 'OK', results })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/halfShutter', async (req, res) => {
  try {
    const index = validateIndex(req, 'Halfway shutter press')
    const results = await pressShutterButton(isNaN(index) ? '*' : index, true)
    return res.send({ status: 'OK', results })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/fullShutter', async (req, res) => {
  try {
    const index = validateIndex(req, 'Full shutter press')
    const results = await pressShutterButton(isNaN(index) ? '*' : index)
    return res.send({ status: 'OK', results })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/syncTime', async (req, res) => {
  const now = new Date()
  // const tzString = Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    const index = validateIndex(req, 'Synchronizing date and time')
    const results = await setCameraProperty(isNaN(index) ? '*' : index, 'UTCTime', now)
    // setCameraProperty(isNaN(index) ? '*' : index, 'TimeZone', computeTZValue(tzString))
    return res.send({ status: 'OK', results })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index, value: now.getTime() })
  }
})

router.post('/:index/:propID', async (req, res) => {
  try {
    const index = validateIndex(req, `Setting ${req.params.propID}`)
    const results = await setCameraProperty(isNaN(index) ? '*' : index, req.params.propID, req.body.value)
    return res.send({ status: 'OK', results })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: req.params.index,
      identifier: req.params.propID,
      value: req.body.value
    })
  }
})

router.post('/:index', async (req, res) => {
  try {
    const index = validateIndex(req, 'Setting bulk properties')
    const results = await setCameraProperties(isNaN(index) ? '*' : index, req.body)
    return res.send({ status: 'OK', results })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index, body: req.body })
  }
})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
