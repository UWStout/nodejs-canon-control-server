import childProcess from 'child_process'
import fs from 'fs'

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
const NAS_USERNAME = process.env.NAS_USERNAME || 'error'
const NAS_PASSWORD = process.env.NAS_PASSWORD || 'error'

export async function setupNAS () {
  if (NAS_ENABLED.toLowerCase() !== 'true') {
    log.info('Skipping NAS mount (disabled in env)')
    return true
  }

  // Try to run the mount command
  try {
    // Test if drive is mounted
    if (!fs.existsSync(`${NAS_DRIVE_LETTER}:`)) {
      log.info('NAS not mounted, attempting to mount')

      // Run net delete command first (in case we have a lingering map)
      childProcess.spawnSync('net', ['use', `${NAS_DRIVE_LETTER}:`, '/delete'], { encoding: 'utf8' })

      // Run net use command
      const args = [
        'use',
        `${NAS_DRIVE_LETTER}:`,
        NAS_SERVER_ADDRESS,
        `/user:${NAS_USERNAME}`,
        NAS_PASSWORD
      ]
      const result = childProcess.spawnSync('net', args, { encoding: 'utf8' })
      if (result.status !== 0) {
        log.error('NAS Mount command failed')
        log.error(result.error)
      } else {
        // Test if drive is mounted
        if (!fs.existsSync(`${NAS_DRIVE_LETTER}:`)) {
          log.error('NAS failed to mount')
          return false
        }
      }
    }
  } catch (error) {
    log.error('Failed to mount NAS')
    log.error(error.message)
    return false
  }

  return true
}
