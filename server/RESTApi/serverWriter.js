// Basic HTTP routing library
import Express from 'express'
import { createNewSessionStorage } from '../camSDK/SDKEventHelper.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'main-writ')

// Create a router to attach to an express server app
const router = new Express.Router()

// Install JSON body parser for all these routes
router.use(Express.json())
// router.use(Express.urlencoded( { extended: false , type: '*/*' } )) // For multiple query params

log.info("Server Writer Running")


// ******* Writing routes **************

router.post('/session/create/:mstime/:nickname?', (req, res) => {
  try {
    const result = createNewSessionStorage(req.params.mstime, req.params.nickname)
    result.status = "OK"
    return res.send(result)
  } catch (err) {
    return res.send({ error: true })
  }
})

export default router