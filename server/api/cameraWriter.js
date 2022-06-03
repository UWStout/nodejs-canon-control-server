// Basic HTTP routing library
import Express from 'express'

import {
  setCameraProperty
} from './APICameraHelper.js'

import CameraAPIError from './CameraAPIError.js'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:writer')

// Create a router to attach to an express server app
const router = new Express.Router()

// Install JSON body parser for all these routes
router.use(Express.json())

// ******* API Camera Writing routes **************
router.post('/:index/:propID', (req, res) => {
  debug(`Setting ${req.params.propID} for camera ${parseInt(req.params.index)}`)
  try {
    setCameraProperty(parseInt(req.params.index), req.params.propID, req.body.value)
    return res.send({ status: 'OK' })
  } catch (err) {
    return CameraAPIError.respond(err, res, {
      index: parseInt(req.params.index),
      identifier: req.params.propID,
      value: req.body.value
    })
  }
})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
