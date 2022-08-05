// Basic HTTP routing library
import Express from 'express'

import {
  setCameraPropertyForOne,
  setCameraPropertyForAll,
  setCameraPropertiesForOne,
  setCameraPropertiesForAll,
  takePictureForOne,
  takePictureForAll,
  pressShutterButtonForOne,
  pressShutterButtonForAll,
  resetOne,
  resetAll
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
router.post('/:index/reset', (req, res) => {
  try {
    const index = validateIndex(req, 'Resetting')
    if (isNaN(index)) {
      const taskId = resetAll()
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      const result = resetOne(index)
      return res.send({ status: 'OK', result })
    }
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/trigger', (req, res) => {
  try {
    const index = validateIndex(req, 'Taking picture')
    if (isNaN(index)) {
      const taskId = takePictureForAll()
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      const result = takePictureForOne(index)
      return res.send({ status: 'OK', result })
    }
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/halfShutter', (req, res) => {
  try {
    const index = validateIndex(req, 'Halfway shutter press')
    if (isNaN(index)) {
      const taskId = pressShutterButtonForAll(true)
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      const result = pressShutterButtonForOne(index, true)
      return res.send({ status: 'OK', result })
    }
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/fullShutter', async (req, res) => {
  try {
    const index = validateIndex(req, 'Full shutter press')
    if (isNaN(index)) {
      const taskId = pressShutterButtonForAll(false)
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      const result = pressShutterButtonForOne(index, false)
      return res.send({ status: 'OK', result })
    }
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/syncTime', async (req, res) => {
  const now = new Date()
  // const tzString = Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    const index = validateIndex(req, 'Synchronizing date and time')
    if (isNaN(index)) {
      const taskId = setCameraPropertyForAll('UTCTime', now, 'Bulk clock sync')
      // setCameraPropertyForAll('TimeZone', computeTZValue(tzString))
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      const result = setCameraPropertyForOne(index, 'UTCTime', now)
      // setCameraPropertyForOne(index, 'TimeZone', computeTZValue(tzString))
      return res.send({ status: 'OK', result })
    }
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index, value: now.getTime() })
  }
})

router.post('/:index/:propID', (req, res) => {
  try {
    const index = validateIndex(req, `Setting ${req.params.propID}`)
    if (isNaN(index)) {
      const taskId = setCameraPropertyForAll(req.params.propID, req.body.value)
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      const result = setCameraPropertyForOne(index, req.params.propID, req.body.value)
      return res.send({ status: 'OK', result })
    }
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
    if (isNaN(index)) {
      const taskId = setCameraPropertiesForAll(req.body)
      return res.status(202).send({ status: 'STARTED', taskId })
    } else {
      setCameraPropertiesForOne(index, req.body)
      return res.send({ status: 'OK' })
    }
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index, body: req.body })
  }
})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
