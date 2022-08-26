import fs from 'fs'
import path from 'path'

import { exiftool } from 'exiftool-vendored'

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

// Current capture path for image downloads and filename suffix (if any)
let downloadPath = ''
let filenameSuffix = ''

// Set the directory to download incoming images to
export function setDownloadPath (sessionPath, capturePath) {
  ensureFolderExists(capturePath, sessionPath, false)
  downloadPath = path.join(sessionPath, capturePath)
}

// Set the directory to download incoming images to
export function setFilenameSuffix (newSuffix) {
  filenameSuffix = newSuffix
}

// Retrieve current directory images should download into
export function getDownloadPath () {
  return downloadPath
}

// Retrieve current filename suffix
export function getFilenameSuffix () {
  return filenameSuffix
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

export function getImageInfoFromFile (filepath) {
  return new Promise((resolve, reject) => {
    exiftool.read(filepath).then(tags => {
      return resolve({
        shutterSpeed: tags.ExposureTime,
        apertureValue: tags.Aperture,
        iso: tags.ISO,
        focalLength: tags.FocalLength,
        whiteBalance: tags.WhiteBalance,
        exposureComp: tags.ExposureCompensation,
        width: tags.ImageWidth,
        height: tags.ImageHeight,
        orientation: tags.Orientation
      })
    }).catch(error => {
      log.error('Rejected promise while extracting EXIF data')
      log.error(error)
      return reject(new Error('Error extracting EXIF data', { cause: error }))
    })
  })
}
