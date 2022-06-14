// Core node libraries
import fs from 'fs'
import https from 'https'

// Our primary HTTP(S) server library
import Express from 'express'

// enabling cross-origin requests
import Cors from 'cors'

// print messages only during debug
import Debug from 'debug'

// prints messages having to do with web traffic
import morgan from 'morgan'

// Standard HTTP routes
import camReadRouter from './api/cameraReader.js'
import camWriteRouter from './api/cameraWriter.js'

import { makeSocket, serverReady } from './sockets.js'

// Read extra environment variables from the .env file
import dotenv from 'dotenv'

// Update environment variables
dotenv.config()
const HOST_NAME = process.env.HOST_NAME || 'localhost'
const DEV_PORT = process.env.DEV_PORT || 3000
const PROD_PORT = process.env.PROD_PORT || 42424

// Setup the _DEV_ variable
const _DEV_ = (process.argv.find((arg) => { return arg === 'dev' }))

// prints messages for debugging purposes
const debug = Debug('parsec:server')

// Create a main express 'App'
const app = new Express()

// Build HTTP/HTTPS server
debug('Creating local HTTPS server')

const SSL_KEY_FILE = process.env.SERVER_KEY || './ssl_certs/server.key'
const SSL_CERT_FILE = process.env.SERVER_CERT || './ssl_certs/server.crt'
const SSLOptions = {
  key: fs.readFileSync(SSL_KEY_FILE),
  cert: fs.readFileSync(SSL_CERT_FILE)
}

// Make an HTTPS express server app
const server = https.createServer(SSLOptions, app)

// prints messages related to web traffic
app.use(morgan(_DEV_ ? 'dev' : 'short'))

// Cors configuration to allow any origin and echo it back
app.use(Cors({ origin: true }))

// Enable parsing of JSON-Encoded bodies
app.use(Express.json())

// Attach our data router 'routes' under '/camera'
app.use('/camera', camReadRouter)
app.use('/camera', camWriteRouter)

// Statically serve files from 'public'
app.use(Express.static('public'))

// Setup web-sockets
makeSocket(server)

// Bind to a port and start listening
if (_DEV_) {
  server.listen(DEV_PORT, HOST_NAME, () => {
    serverReady()
    console.log(`PARSEC Camera DEV server listening on port ${DEV_PORT}`)
  })
} else {
  server.listen(PROD_PORT, HOST_NAME, () => {
    serverReady()
    console.log(`PARSEC Camera server listening on port ${PROD_PORT}`)
  })
}

// Log on SIGINT and SIGTERM before exiting
function handleSignal (signal) {
  debug(`Received ${signal}, exiting.`)
  process.exit(0)
}
process.on('SIGINT', handleSignal)
process.on('SIGTERM', handleSignal)
