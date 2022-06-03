// Basic HTTP routing library
import Express from 'express'

import { getCameraSummaryList, getCameraInfo } from './canonAPIHelper.js'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:reader')

// Create a router to attach to an express server app
const router = new Express.Router()

// ******* API Camera Reading routes **************
router.get('/', (req, res) => {
  debug('sending camera summary list')
  const cameras = getCameraSummaryList()
  res.json(cameras)
})

router.get('/:index', (req, res) => {
  debug(`sending details for camera ${req.params.index}`)
  const cameraDetails = getCameraInfo(parseInt(req.params.index), false)
  res.json(cameraDetails)
})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
