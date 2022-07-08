import fs from 'fs'

const SESSIONS_DIR = './public/images'

// converts and integer(num) into a string that is (digits) long by adding leading zeros
function numStrLeadZeros(num, digits) {
  let numStr = ""
  for ( let i = num.toString().length ; i < digits ; ++i ){
    numStr += "0"
  }
  return numStr + num
}

// Creates a unique fullname & path for provided nickname & time
function createSessionData(time, nickname = undefined) {
  if (!nickname) {
    nickname = time
  }
  const date = new Date(parseInt(time))

  const fullname = `SES_${nickname}_AT_${numStrLeadZeros(date.getHours(), 2)}_${numStrLeadZeros(date.getMinutes(), 2)}_${date.toDateString()}`.replaceAll(" ", "_")
  const path = `${SESSIONS_DIR}/${fullname}`
  return {
    nickname: nickname,
    fullname: fullname,
    path: path,
    time: time,
    date: date,
    captures: 0
  }
}

// Adds sessionData to the sessions.json file
function addSessionToList(sessionData) {
  const listPath = `${SESSIONS_DIR}/sessions.json`
  let rawData
  try { rawData = fs.readFileSync( listPath, { encoding: 'utf8' } ) }
  catch (err) { return { error: true } }

  const parsedData = JSON.parse(rawData)
  parsedData.push(sessionData)
  const dataStr = JSON.stringify(parsedData, null, 2)

  try { fs.writeFileSync(listPath, dataStr, { encoding:'utf8' }) }
  catch (err) { return { error: true } }
  return { error: false }
}

// creates a new session // TODO break this up and clean. multiple function calls in the route is OK, no need to smash them together here
export function createNewSessionStorage (time, nickname = undefined) {

  const sessionData = createSessionData(time, nickname)

  const result = {
    error: true,
    result: "incomplete",
    sessionData: sessionData
  }

  if (fs.existsSync(sessionData.path)) {
    result.error = true
    result.result = "Path / Session already exists"
  }
  else {
    try {
      fs.mkdirSync(sessionData.path)
      result.error = false
      result.result = "Session created successfuly"
    } catch (err) {
      result.error = true
      result.result = "Failed to Create Session"
    }
  }

  if (result.error === false) {
    result.error = addSessionToList(sessionData).error
    if (result.error) {
      result.result += " & Failed to update session list"
    }
    else
    {
      result.result += " & Session list updated"
    }
  }
  return result
}

// Creates a new directory for a single multi-camera capture within provided session path
export function createCaptureInSession(sessionPath, captureNumber, folderName = "Capture_") {
  // Ensure session directory exists
  if (!fs.existsSync(sessionPath)) {
    return {
      error: true,
      result: 'Unable to find session diretory'
    }
  }

  const capturePath = `${sessionPath}/${folderName}${captureNumber}`
  // Ensure capture directory does not already exist
  if (fs.existsSync(capturePath)) {
    return {
      error: true,
      result: `Capture: ${folderName}${captureNumber} already exists`
    }
  }

  // Create capture directory and return the path
  try {
    fs.mkdirSync(capturePath)
  }
  catch (err) {
    return {
      error: true,
      result: 'Unable to create capture directory'
    }
  }

  return {
    result: "Capture directory created",
    path: capturePath
  }
}