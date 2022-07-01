// Basic HTTP routing library
import Express from 'express'

import {
  portList, SNList,
  getCameraSummaryList,
  getCameraInfo,
  getCameraProperty
} from '../camSDK/SDKCameraHelper.js'

import RESTAPIError from './RESTAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'reader')

// Create a router to attach to an express server app
const router = new Express.Router()

// ******* API Camera Reading routes **************
router.get('/', (req, res) => {
  log.info('sending camera summary list')
  try {
    const cameras = getCameraSummaryList()
    return res.json(cameras)
  } catch (e) {
    RESTAPIError.respond(e, res, log)
  }
})

router.get('/serials', (req, res) => {
  log.info('sending camera serial number lookup list')
  try {
    return res.json(SNList)
  } catch (e) {
    RESTAPIError.respond(e, res, log)
  }
})

router.get('/ports', (req, res) => {
  log.info('sending camera port name lookup list')
  try {
    return res.json(portList)
  } catch (e) {
    RESTAPIError.respond(e, res, log)
  }
})

router.get('/:index', (req, res) => {
  log.info(`sending details for camera ${req.params.index}`)
  try {
    const cameraDetails = getCameraInfo(parseInt(req.params.index), false)
    return res.json(cameraDetails)
  } catch (e) {
    RESTAPIError.respond(e, res, log)
  }
})

router.get('/:index/:propID', (req, res) => {
  log.info(`sending current value of property ${req.params.propID} on camera ${req.params.index}`)
  try {
    const cameraProperty = getCameraProperty(parseInt(req.params.index), req.params.propID)
    return res.json(cameraProperty)
  } catch (e) {
    RESTAPIError.respond(e, res, log, {
      index: parseInt(req.params.index),
      propID: req.params.propID
    })
  }
})

router.get('/:index/:propID/allowed', (req, res) => {
  log.info(`sending allowed values for property ${req.params.propID} on camera ${req.params.index}`)
  try {
    const cameraProperty = getCameraProperty(parseInt(req.params.index), req.params.propID)
    return res.json(cameraProperty.allowedValues)
  } catch (e) {
    RESTAPIError.respond(e, res, log, {
      index: parseInt(req.params.index),
      propID: req.params.propID
    })
  }
})

// ******* API Camera Reading routes **************

// Expose the router for use in other files
export default router
