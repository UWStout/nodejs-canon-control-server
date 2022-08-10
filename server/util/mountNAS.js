// Read extra environment variables from the .env file
import dotenv from 'dotenv'

// Setup logging
import { makeLogger } from './logging.js'
const log = makeLogger('server', 'NASMount')

// Update environment variables
dotenv.config()
const NAS_ENABLED = process.env.NAS_ENABLED || false
const NAS_DRIVE_LETTER = process.env.NAS_DRIVE_LETTER || 'P'
const NAS_SERVER_ADDRESS = process.env.NAS_SERVER_ADDRESS || '1.1.1.1'
const NAS_DOWNLOAD_DIR = process.env.NAS_DOWNLOAD_DIR || ''
const NAS_USERNAME = process.env.NAS_USERNAME || 'error'
const NAS_PASSWORD = process.env.NAS_PASSWORD || 'error'

export async function setupNAS () {
  if (NAS_ENABLED.toLowerCase() !== 'true') {
    log.info('Skipping NAS mount (disabled in env)')
    return true
  }

  log.info(`Ensuring NAS mounted [${NAS_SERVER_ADDRESS} -> ${NAS_DRIVE_LETTER}:\\${NAS_DOWNLOAD_DIR}]`)
  return true
}
