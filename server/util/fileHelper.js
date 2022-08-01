import fs from 'fs'
import path from 'path'

import exif from 'exif'

// Update environment variables
import dotenv from 'dotenv'

// Setup logging
import { makeLogger } from '../util/logging.js'
import CameraAPIError from '../RESTApi/CameraAPIError.js'
const log = makeLogger('server', 'file-util')

dotenv.config()
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './public/images'

const NICKNAME_FILE_PATH = './server/util/CameraNicknames.json'

// Regular expression to break down session folder data
const SESSION_FOLDER_REGEX = /^SES_(?<nickname>.*)_AT_(?<hour>\d*)_(?<minute>\d*)_(?<day>[a-z]*)_(?<month>[a-z]*)_(?<date>\d*)_(?<year>\d*)$/mi

// Current capture path for image downloads
let downloadPath = ''

// Set the directory to download incoming images to
export function setDownloadPath (sessionPath, capturePath) {
  ensureFolderExists(capturePath, sessionPath, false)
  downloadPath = path.join(sessionPath, capturePath)
}

// Retrieve current directory images should download into
export function getDownloadPath () {
  return downloadPath
}

// Get a list of all directories inside a given path
async function getDirectories (folderPath) {
  try {
    if (!fs.existsSync(folderPath)) { return [] }
    const dirEntries = await fs.promises.readdir(folderPath, { withFileTypes: true })
    return dirEntries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
  } catch (error) {
    log.error(`Failed to list directories inside ${folderPath}`)
    log.error(error)
    return []
  }
}

// Returns list of all sessions in sessions.json
export async function getSessions () {
  // Get list of folders in download dir
  const sessionFolders = await getDirectories(path.resolve(DOWNLOAD_DIR))

  // Map folders to sessions
  const sessionList = []
  for (let i = 0; i < sessionFolders.length; i++) {
    const sessionPath = sessionFolders[i]

    // Extract session data from path
    const { nickname, date, month, year, hour, minute } = sessionPath.match(SESSION_FOLDER_REGEX).groups
    const time = (
      isNaN(parseInt(nickname))
        ? Date.parse(`${date} ${month} ${year} ${hour}:${minute}`)
        : parseInt(nickname)
    )

    // Add session data for this folder
    sessionList.push({
      path: sessionPath,
      nickname,
      time,
      captures: await getDirectories(path.join(DOWNLOAD_DIR, sessionPath))
    })
  }

  // Return the list of sessions
  return sessionList
}

export function ensureFolderExists (folderName, parentDir = '', createIfNotFound = false) {
  // Ensure parent directory exists
  if (!fs.existsSync(path.join(DOWNLOAD_DIR, parentDir))) {
    throw new CameraAPIError(404, null, 'Parent directory does not exist')
  }

  // Check for folder and create if allowed
  if (!fs.existsSync(path.join(DOWNLOAD_DIR, parentDir, folderName))) {
    if (createIfNotFound) {
      fs.mkdirSync(path.join(DOWNLOAD_DIR, parentDir, folderName))
    } else {
      throw new CameraAPIError(404, null, 'Folder not found')
    }
  }
}

export function createFolder (folderName, parentDir = '') {
  // Ensure parent directory exists
  if (!fs.existsSync(path.join(DOWNLOAD_DIR, parentDir))) {
    return {
      error: true,
      result: 'Unable to find parent directory'
    }
  }

  const newDir = path.join(parentDir, folderName)
  // Ensure new directory does not already exist
  if (fs.existsSync(path.join(DOWNLOAD_DIR, newDir))) {
    return {
      error: true,
      result: `${newDir} already exists`
    }
  }

  // Try to create new directory
  try {
    fs.mkdirSync(path.join(DOWNLOAD_DIR, newDir), { recursive: true })
  } catch (err) {
    return {
      error: true,
      result: 'Unable to create new directory'
    }
  }

  // Return success and full path to new directory
  return {
    success: true,
    result: 'New directory created',
    path: newDir
  }
}

export function getCameraNicknames () {
  // Read list of camera nicknames into array
  const rawData = fs.readFileSync(NICKNAME_FILE_PATH, { encoding: 'utf8' })
  return JSON.parse(rawData)
}

export function updateCameraNicknames (updatedNicknames) {
  // Get list of existing nicknames and merge
  const currentNicknames = getCameraNicknames()
  const newNicknames = { ...currentNicknames, ...updatedNicknames }

  // Write back to 'CameraNicknames' file
  fs.writeFileSync(
    NICKNAME_FILE_PATH,
    JSON.stringify(newNicknames, null, 2),
    { encoding: 'utf8' }
  )
}

export function getImageInfo (fileBuffer) {
  return new Promise((resolve, reject) => {
    try {
      exif.ExifImage({ image: fileBuffer }, (error, data) => {
        if (error) {
          return reject(new Error('Error extracting EXIF data', { cause: error }))
        }

        return resolve({
          shutterSpeed: data.exif.ExposureTime,
          apertureValue: data.exif.FNumber,
          iso: data.exif.ISO,
          focalLength: data.exif.FocalLength,
          whiteBalance: data.exif.WhiteBalance,
          exposureComp: data.exif.ExposureCompensation,
          width: data.exif.ExifImageWidth,
          height: data.exif.ExifImageHeight,
          orientation: data.image.orientation
        })
      })
    } catch (error) {
      return reject(new Error('Error extracting EXIF data', { cause: error }))
    }
  })
}
