// Basic HTTP routing library
import Express from 'express'

import { ensureFolderExists, setDownloadPath, setFilenameSuffix, updateCameraNicknames } from '../util/fileHelper.js'
import { setLiveViewTimeout } from './liveViewSocketStreamer.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
import CameraAPIError from './CameraAPIError.js'
const log = makeLogger('server', 'main-writ')

// Default capture number if none was provided
const DEFAULT_CAPTURE_NUMBER = 1

// Create a router to attach to an express server app
const router = new Express.Router()

// Install JSON body parser for all these routes
router.use(Express.json())
log.info('Server Writer Routes Active')

// ******* Writing routes **************
router.post('/capture/fileSuffix', (req, res) => {
  const fileSuffix = req.body.fileSuffix || ''
  try {
    setFilenameSuffix(fileSuffix)
    return res.send('OK')
  } catch (err) {
    CameraAPIError.respond(err, res, log, {
      fileSuffix
    })
  }
})

router.post(['/session/create', '/session/confirm'], (req, res) => {
  // Determine which route was matched
  const createAllowed = req.path.includes('create')

  // Read session data either directly from body in the 'sessionData' property
  const sessionData = req.body.sessionData || {
    nickname: req.body.nickname,
    path: req.body.path,
    time: req.body.time
  }

  // Remove trailing path separators
  if (sessionData.path.slice(-1) === '/' || sessionData.path.slice(-1) === '\\') {
    sessionData.path = sessionData.path.slice(0, -1)
  }

  try {
    // Ensure no sub-directories are specified
    if (sessionData.path.includes('/') || sessionData.path.includes('\\')) {
      throw new CameraAPIError(400, null, 'Path cannot include subdirectories')
    }

    ensureFolderExists(sessionData.path, '', createAllowed)
    return res.send('OK')
  } catch (err) {
    CameraAPIError.respond(err, res, log, { folderName: sessionData.path })
  }
})

function validateCaptureNumber (captureNumber) {
  // Interpret the capture number
  if (typeof captureNumber === 'number') {
    return captureNumber
  }

  if (typeof captureNumber === 'string') {
    return parseInt(captureNumber)
  }

  return DEFAULT_CAPTURE_NUMBER
}

router.post(['/capture/create', '/capture/confirm'], (req, res) => {
  // Interpret the capture number
  const captureInt = validateCaptureNumber(req.body.captureNumber)

  // Read request properties
  const createAllowed = req.path.includes('create')
  const captureName = req.body.captureName || 'Capture'

  try {
    // Ensure the capture number is valid
    if (isNaN(captureInt) || captureInt < 0) {
      throw new CameraAPIError(400, null, 'Capture number must be a non-negative number')
    }

    // Ensure the requested folder exists (possibly creating it)
    const captureNumber = captureInt.toFixed().padStart(3, '0')
    ensureFolderExists(`${captureName}_${captureNumber}`, req.body.sessionPath, createAllowed)
    return res.send('OK')
  } catch (err) {
    CameraAPIError.respond(err, res, log, {
      captureName,
      captureNumber: captureInt,
      parent: req.body.sessionPath
    })
  }
})

router.post('/capture/select', (req, res) => {
  // Interpret the capture number
  const captureInt = validateCaptureNumber(req.body.captureNumber)
  const captureName = req.body.captureName || 'Capture'
  const sessionPath = req.body.sessionPath

  try {
    // Ensure the capture number is valid
    if (isNaN(captureInt) || captureInt < 0) {
      throw new CameraAPIError(400, null, 'Capture number must be a non-negative number')
    }

    // Seth the proper download path (if it exists)
    const captureNumber = captureInt.toFixed().padStart(3, '0')
    setDownloadPath(sessionPath, `${captureName}_${captureNumber}`)
    return res.send('OK')
  } catch (err) {
    CameraAPIError.respond(err, res, log, {
      sessionPath,
      captureName,
      captureNumber: captureInt
    })
  }
})

// Quickly update the list of camera nicknames
router.post('/nicknames', (req, res) => {
  const newNicknames = req.body
  updateCameraNicknames(newNicknames)
  res.send('OK')
})

router.post('/liveview/timeout/:value', (req, res) => {
  const newTimeout = req.params.value
  try {
    setLiveViewTimeout(newTimeout)
    res.send('OK')
  } catch (err) {
    CameraAPIError.respond(err, res, log, {
      newTimeout
    })
  }
})

export default router
