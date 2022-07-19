import fs from 'fs'
import path from 'path'

// Update environment variables
import dotenv from 'dotenv'
dotenv.config()
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './public/images'

// converts an integer(num) into a string that is (digits) long by adding leading zeros
function numStrLeadZeros (num, digits) {
  let numStr = ''
  for (let i = num.toString().length; i < digits; ++i) {
    numStr += '0'
  }
  return numStr + num
}

// Creates a unique fullname & path for provided nickname & time
export function createSessionData (time, nickname = '') {
  const date = new Date(parseInt(time))
  const path = `SES_${nickname || time}_AT_${numStrLeadZeros(date.getHours(), 2)}_${numStrLeadZeros(date.getMinutes(), 2)}_${date.toDateString()}`.replaceAll(' ', '_')
  return {
    nickname,
    path,
    time
  }
}

// Adds sessionData to the sessions.json file
export function addSessionToList (sessionData) {
  const listResult = getSessions()
  if (listResult.error) {
    return listResult
  }

  listResult.sessions.push(sessionData)
  const dataStr = JSON.stringify(listResult.sessions, null, 2)

  try {
    fs.writeFileSync(path.join(DOWNLOAD_DIR, 'sessions.json'), dataStr, { encoding: 'utf8' })
  } catch (err) {
    return {
      error: true,
      result: 'Unable to add session data to session list'
    }
  }

  return {
    success: true,
    result: 'Session added to session list'
  }
}

// Returns list of all sessions in sessions.json
export function getSessions () {
  try {
    const rawData = fs.readFileSync(
      path.join(DOWNLOAD_DIR, 'sessions.json'),
      { encoding: 'utf8' }
    )
    return {
      success: true,
      sessions: JSON.parse(rawData)
    }
  } catch (err) {
    return {
      error: true,
      result: 'Unable to get session list'
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

export function getCameraNicknameList () {
  // Read list of camera nicknames into array
  const rawData = fs.readFileSync(
    './server/RESTApi/CameraNicknames.json',
    { encoding: 'utf8' }
  )
  return JSON.parse(rawData)
}
