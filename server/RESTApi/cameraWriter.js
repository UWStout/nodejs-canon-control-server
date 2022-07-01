// Basic HTTP routing library
import Express from 'express'

import {
  setCameraProperty,
  takePicture,
  pressShutterButton
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

function validateIndex (req, message = 'Writing') {
  const index = parseInt(req.params.index)
  if (req.params.index === '*') {
    log.info(`${message} for ALL cameras`)
  } else if (!isNaN(index)) {
    log.info(`${message} for camera ${index}`)
  } else {
    throw new CameraAPIError(400, 'Invalid index type. Must be an integer or *')
  }

  return index
}

// ******* API Camera Writing routes **************
router.post('/:index/trigger', (req, res) => {
  try {
    const index = validateIndex(req, 'Taking picture')
    takePicture(isNaN(index) ? '*' : index)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/halfShutter', (req, res) => {
  try {
    const index = validateIndex(req, 'Halfway shutter press')
    pressShutterButton(isNaN(index) ? '*' : index, true)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/fullShutter', (req, res) => {
  try {
    const index = validateIndex(req, 'Full shutter press')
    pressShutterButton(isNaN(index) ? '*' : index)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index })
  }
})

router.post('/:index/syncTime', (req, res) => {
  const now = new Date()
  // const tzString = Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    const index = validateIndex(req, 'Synchronizing date and time')
    setCameraProperty(isNaN(index) ? '*' : index, 'UTCTime', now)
    // setCameraProperty(isNaN(index) ? '*' : index, 'TimeZone', computeTZValue(tzString))
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index, value: now.getTime() })
  }
})

router.post('/:index/:propID', (req, res) => {
  try {
    const index = validateIndex(req, `Setting ${req.params.propID}`)
    setCameraProperty(isNaN(index) ? '*' : index, req.params.propID, req.body.value)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, log, {
      index: req.params.index,
      identifier: req.params.propID,
      value: req.body.value
    })
  }
})

router.post('/:index', (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      throw new Error('Bad request: Body must be array of properties to set')
    }

    const index = validateIndex(req, 'Setting bulk properties')
    const results = {}
    let failCount = 0
    for (let i = 0; i < req.body.length; i++) {
      const property = req.body[i]
      if (typeof property.propID === 'string' && typeof property.value === 'string') {
        try {
          setCameraProperty(isNaN(index) ? '*' : index, property.propID, property.value)
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
  } catch (err) {
    return CameraAPIError.respond(err, res, log, { index: req.params.index, body: req.body })
  }
})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
