// Basic HTTP routing library
import Express from 'express'

import { setCapturePath } from './cameraMonitor.js'
import { createFolder, addSessionToList, createSessionData } from '../util/fileHelper.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'main-writ')

// Create a router to attach to an express server app
const router = new Express.Router()

// Install JSON body parser for all these routes
router.use(Express.json())
log.info('Server Writer Routes Active')

// ******* Writing routes **************
router.post('/session/create/auto/:mstime/:nickname?', (req, res) => {
  try {
    const sessionData = createSessionData(req.params.mstime, req.params.nickname || '')
    const result1 = createFolder(sessionData.path)
    if (result1.error) {
      return res.send(result1)
    }

    const result2 = addSessionToList(sessionData)
    const result = {
      ...(result1.success && result2.success) && { success: true },
      ...(result1.error || result2.error) && { error: true },
      result: result1.result + ' & ' + result2.result,
      sessionData
    }

    return res.send(result)
  } catch (err) {
    return res.send({ error: true })
  }
})

router.post('/session/create/manual', (req, res) => {
  const sessionData = req.body.sessionData || {
    nickname: req.body.nickname,
    path: req.body.path,
    time: req.body.time
  }

  try {
    const result1 = createFolder(sessionData.path)
    if (result1.error) {
      return res.send(result1)
    }

    const result2 = addSessionToList(sessionData)
    const result = {
      ...(result1.success && result2.success) && { success: true },
      ...(result1.error || result2.error) && { error: true },
      result: result1.result + ' & ' + result2.result,
      sessionData
    }

    return res.send(result)
  } catch (err) {
    return res.send({ error: true })
  }
})

router.post('/capture/create', (req, res) => {
  try {
    const folderName = req.body.folderName || 'Capture_'
    const result = createFolder(`${folderName}${req.body.captureNumber}`, req.body.sessionPath)
    return res.send(result)
  } catch (err) {
    return res.send({ error: true })
  }
})

router.post('/capture/select', (req, res) => {
  try {
    setCapturePath(req.body.capturePath)
    return res.send({
      success: true,
      path: req.body.capturePath
    })
  } catch (err) {
    return res.send({ error: true })
  }
})

export default router