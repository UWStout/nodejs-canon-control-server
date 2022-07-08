// Basic HTTP routing library
import Express from 'express'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'main-read')

// Create a router to attach to an express server app
const router = new Express.Router()
log.info("Server Reader Running")

export default router