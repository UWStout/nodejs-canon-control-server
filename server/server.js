// Core node libraries
import fs from 'fs'
import https from 'https'

// Examining and killing running processes
import psList from 'ps-list'

// Service discovery
import { advertise } from 'dnssd-advertise'

// Our primary HTTP(S) server library
import Express from 'express'

// enabling cross-origin requests
import Cors from 'cors'

// Standard HTTP routes
import camReadRouter from './RESTApi/cameraReader.js'
import camWriteRouter from './RESTApi/cameraWriter.js'
import serverReadRouter from './RESTApi/serverReader.js'
import serverWriteRouter from './RESTApi/serverWriter.js'
import triggerBoxRouter from './RESTApi/triggerRouter.js'

import { makeSocket, serverReady } from './sockets.js'

// Read extra environment variables from the .env file
import dotenv from 'dotenv'
import { makeLogger } from './util/logging.js'
import { setupNAS } from './util/mountNAS.js'

// Update environment variables
dotenv.config()
const HOST_NAME = process.env.HOST_NAME || 'localhost'
const DEV_PORT = process.env.DEV_PORT || 3000
const PROD_PORT = process.env.PROD_PORT || 42424

// Setup the _DEV_ variable
const _DEV_ = (process.env.NODE_ENV === 'development')

// Logger for 'morgan' like output to our winston logger
const expressLogger = makeLogger('server', 'express')

// Standard logger
const log = makeLogger('server', 'main')

// Create a main express 'App'
const app = new Express()

// Build HTTP/HTTPS server
log.info('Creating local HTTPS server')

const SSL_KEY_FILE = process.env.SERVER_KEY || './ssl_certs/server.key'
const SSL_CERT_FILE = process.env.SERVER_CERT || './ssl_certs/server.crt'
const SSLOptions = {
  key: fs.readFileSync(SSL_KEY_FILE),
  cert: fs.readFileSync(SSL_CERT_FILE)
}

// Handle NAS Mounting
setupNAS()
  .then(() => log.info('NAS Ready'))
  .catch(error => log.error('NAS mounting failed: ', error.message))

// Publish service via Bonjour
let bonjourStop = null
function enableBonjour (port) {
  // Broadcast service
  bonjourStop = advertise({
    name: 'CanonControlService',
    type: 'http',
    txt: { version: '0.2.0' },
    protocol: 'tcp',
    port
  })

  log.info('CanonControlService Published for service discovery')
}

// Make an HTTPS express server app
const server = https.createServer(SSLOptions, app)

// Log HTTP traffic messages via winston
app.use(expressLogger)

// Cors configuration to allow any origin and echo it back
app.use(Cors({ origin: true }))

// Always redirect to secure context
app.use((req, res, next) => {
  if (req.secure) {
    // Request is already secure
    next()
  } else {
    // Redirect to HTTPS version of the same URL
    res.redirect('https://' + req.headers.host + req.url)
  }
})

// Enable parsing of JSON-Encoded bodies
app.use(Express.json())

// Attach our data router 'routes' under '/camera'
app.use('/camera', camReadRouter)
app.use('/camera', camWriteRouter)

// Attach server data 'routes' under '/server'
app.use('/server', serverReadRouter)
app.use('/server', serverWriteRouter)

// Attach all trigger box 'routes' under '/trigger'
app.use('/trigger', triggerBoxRouter)

// Statically serve files from 'public'
app.use(Express.static('public'))

// Setup web-sockets
makeSocket(server)

// Lookup running server processes
psList().then((procList) => {
  procList.forEach((process) => {
    if (process.name.includes('node.exe')) {
      log.info(`PID: ${process.pid}, NAME: #${process.name}`)
    }
  })
}).catch((err) => {
  log.error('Failed to lookup running processes')
  log.error(err)
})

// Bind to a port and start listening
if (_DEV_) {
  server.listen(DEV_PORT, HOST_NAME, () => {
    log.info(`PARSEC Camera DEV server listening on https://${HOST_NAME}:${DEV_PORT}`)

    // Wait for initial property and camera add events to clear before enabling socket messages
    setTimeout(() => {
      log.info('Enabling sockets')
      serverReady()
      enableBonjour(DEV_PORT)
    }, 2000)
  })
} else {
  server.listen(PROD_PORT, HOST_NAME, () => {
    log.info(`PARSEC Camera server listening on https://${HOST_NAME}:${PROD_PORT}`)

    // Wait for initial property and camera add events to clear before enabling socket messages
    setTimeout(() => {
      log.info('Enabling sockets')
      serverReady()
      enableBonjour(PROD_PORT)
    }, 2000)
  })
}

// Log on SIGINT and SIGTERM before exiting
async function handleSignal (signal) {
  log.info(`Received ${signal}, exiting.`)
  try {
    if (bonjourStop != null) {
      log.info('Stopping service discovery')
      await bonjourStop()
    }
  } catch (err) {
    log.warn('Failed to stop service discovery')
  }
}

process.on('SIGINT', handleSignal)
process.on('SIGTERM', handleSignal)
