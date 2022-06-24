// Basic HTTP routing library
import Express from 'express'

import {
  setCameraProperty,
  takePicture,
  pressShutterButton
  // computeTZValue
} from './APICameraHelper.js'

import CameraAPIError from './CameraAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'writer')

// Create a router to attach to an express server app
const router = new Express.Router()

// Install JSON body parser for all these routes
router.use(Express.json())

// ******* API Camera Writing routes **************
router.post('/:index/trigger', (req, res) => {
  log.info(`Triggering shutter for camera ${parseInt(req.params.index)}`)
  try {
    takePicture(parseInt(req.params.index))
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: parseInt(req.params.index)
    })
  }
})

router.post('/:index/halfShutter', (req, res) => {
  log.info(`Halfway shutter press for camera ${parseInt(req.params.index)}`)
  try {
    pressShutterButton(parseInt(req.params.index), true)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: parseInt(req.params.index)
    })
  }
})

router.post('/:index/fullShutter', (req, res) => {
  log.info(`Full shutter press for camera ${parseInt(req.params.index)}`)
  try {
    pressShutterButton(parseInt(req.params.index))
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: parseInt(req.params.index)
    })
  }
})

router.post('/:index/syncTime', (req, res) => {
  log.info(`Synchronizing date and time for camera ${parseInt(req.params.index)}`)
  const now = new Date()
  // const tzString = Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    setCameraProperty(parseInt(req.params.index), 'UTCTime', now)
    // setCameraProperty(parseInt(req.params.index), 'TimeZone', computeTZValue(tzString))
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: parseInt(req.params.index),
      value: now.getTime()
    })
  }
})

router.post('/:index/:propID', (req, res) => {
  log.info(`Setting ${req.params.propID} for camera ${parseInt(req.params.index)}`)
  try {
    setCameraProperty(parseInt(req.params.index), req.params.propID, req.body.value)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: parseInt(req.params.index),
      identifier: req.params.propID,
      value: req.body.value
    })
  }
})

router.post('/:index', (req, res) => {
  log.info(`Setting bulk properties for camera ${parseInt(req.params.index)}`)
  if (!Array.isArray(req.body)) {
    return res.status(400).json({
      error: true,
      message: 'Bad request: Body must be array of properties to set',
      body: req.body
    })
  }

  const results = {}
  let failCount = 0
  for (let i = 0; i < req.body.length; i++) {
    const property = req.body[i]
    if (typeof property.propID === 'string' && typeof property.value === 'string') {
      try {
        setCameraProperty(parseInt(req.params.index), property.propID, property.value)
        results[property.propID] = { status: 'ok' }
      } catch (error) {
        results[property.propID] = { status: 'error', error: error.message }
        failCount++
      }
    } else {
      if (!results.unknown) {
        results.unknown = [property]
      } else {
        results.unknown.push(property)
      }
    }
  }

  if (failCount > 0) {
    return res.status(failCount >= req.body.length ? 400 : 200).json(
      { error: true, ...results }
    )
  }

  return res.json(results)
})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
