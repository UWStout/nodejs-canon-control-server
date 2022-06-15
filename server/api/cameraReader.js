// Basic HTTP routing library
import Express from 'express'

import {
  portList, SNList,
  getCameraSummaryList,
  getCameraInfo,
  getCameraProperty
} from './APICameraHelper.js'

import CameraAPIError from './CameraAPIError.js'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:reader')

// Create a router to attach to an express server app
const router = new Express.Router()

// ******* API Camera Reading routes **************
router.get('/', (req, res) => {
  debug('sending camera summary list')
  try {
    const cameras = getCameraSummaryList()
    return res.json(cameras)
  } catch (e) {
    CameraAPIError.respond(e, res)
  }
})

router.get('/serials', (req, res) => {
  debug('sending camera serial number lookup list')
  try {
    return res.json(SNList)
  } catch (e) {
    CameraAPIError.respond(e, res)
  }
})

router.get('/ports', (req, res) => {
  debug('sending camera port name lookup list')
  try {
    return res.json(portList)
  } catch (e) {
    CameraAPIError.respond(e, res)
  }
})

router.get('/:index', (req, res) => {
  debug(`sending details for camera ${req.params.index}`)
  try {
    const cameraDetails = getCameraInfo(parseInt(req.params.index), false)
    return res.json(cameraDetails)
  } catch (e) {
    CameraAPIError.respond(e, res)
  }
})

router.get('/:index/:propID', (req, res) => {
  debug(`sending current value of property ${req.params.propID} on camera ${req.params.index}`)
  try {
    const cameraProperty = getCameraProperty(parseInt(req.params.index), req.params.propID)
    return res.json(cameraProperty)
  } catch (e) {
    CameraAPIError.respond(e, res, {
      index: parseInt(req.params.index),
      propID: req.params.propID
    })
  }
})

router.get('/:index/:propID/allowed', (req, res) => {
  debug(`sending allowed values for property ${req.params.propID} on camera ${req.params.index}`)
  try {
    const cameraProperty = getCameraProperty(parseInt(req.params.index), req.params.propID)
    return res.json(cameraProperty.allowedValues)
  } catch (e) {
    CameraAPIError.respond(e, res, {
      index: parseInt(req.params.index),
      propID: req.params.propID
    })
  }
})

// ******* API Camera Reading routes **************

// Expose the router for use in other files
export default router
