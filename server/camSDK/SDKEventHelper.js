// The camera control API
import camAPI from '@dimensional/napi-canon-cameras'
import fs from 'fs'

const POLLING_INTERVAL_MS = 100
const SESSIONS_DIR = './public/images'

export function setupEventMonitoring (eventCallback, updateCameraList = 0, log = console) {
  // Set event callback
  camAPI.cameraBrowser.setEventHandler(eventCallback)

  // Initiate watching for camera events
  try {
    camAPI.cameraBrowser.getCameras()
    camAPI.watchCameras(POLLING_INTERVAL_MS)
    log.info('Awaiting camera events')
  } catch (e) {
    log.error(`Error watching for camera connect/disconnect events: ${e.message}`)
  }

  // Initiate periodic polling to update camera list
  if (updateCameraList) {
    setTimeout(() => camAPI.cameraBrowser.update(), updateCameraList)
  }
}

export function monitorCamera (camIndex, eventCallback, log = console) {
  // Initiate watching for camera events
  try {
    const curCam = new camAPI.Camera(camIndex)
    curCam.setEventHandler(eventCallback)
  } catch (e) {
    log.error(`Error watching for camera events: ${e.message}`)
  }
}

function numStrLeadZeros(num, digits) {
  let numStr = ""
  for ( let i = num.toString().length ; i < digits ; ++i ){
    numStr += "0"
  }
  return numStr + num
}

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
    date: date
  }
}

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
