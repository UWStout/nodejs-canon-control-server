// Basic HTTP routing library
import Express from 'express'

// Setup debug for output
import Debug from 'debug'
const debug = Debug('parsec:server:writer')

// Create a router to attach to an express server app
const router = new Express.Router()

// ******* API Camera Writing routes **************
router.post('/', (req, res) => {})
// ******* API Camera Writing routes **************

// Expose the router for use in other files
export default router
