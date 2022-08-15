import camAPI from '@dimensional/napi-canon-cameras'
import CameraAPIError from '../RESTApi/CameraAPIError.js'

import { createBulkTask } from '../RESTApi/bulkTaskManager.js'
import { prepareToReceiveExposureInfo } from '../RESTApi/cameraMonitor.js'
import { getCameraNicknames } from '../util/fileHelper.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'APIDevice')

// Queue a function to run as soon as it can AFTER the current event loop
function runSoon (callback) {
  setTimeout(callback, 0)
}

// Remove any extra categories from a SDK property
export function trimProp (propertyValue) {
  if (typeof propertyValue !== 'string') {
    return propertyValue
  }

  const index = propertyValue.lastIndexOf('.')
  if (index >= 0) {
    return propertyValue.substring(index + 1)
  }
  return propertyValue
}

// Properties included for summary
const SUMMARY_PROPS = [
  'ProductName',
  'BodyIDEx'
]

// All properties included
const FULL_PROPS = [
  // Base properties
  'ProductName',
  'BodyIDEx',
  'OwnerName',
  // 'DateTime',
  'FirmwareVersion',
  'BatteryLevel',
  'SaveTo',
  'CurrentStorage',
  'MyMenu',

  // Image Properties
  'ImageQuality',
  'WhiteBalance',
  'WhiteBalanceShift',
  'ColorSpace',
  'PictureStyle',
  // 'PictureStyleDesc', (always fails)

  // Capture Properties
  'AEMode',
  'DriveMode',
  'ISOSpeed',
  'MeteringMode',
  'AFMode',
  'Av',
  'Tv',
  'ExposureCompensation',
  'AvailableShots',
  'Bracket',
  'LensName',
  'AEBracket',
  'LensStatus',
  'Artist',
  'Copyright',
  'AEModeSelect'
]

// Some camera lookup tables
export let SNList = []
export let portList = []

export function getCameraNickname (camIndex) {
  const serial = SNList[camIndex]
  return (getCameraNicknames()[serial] || `SN_${serial}`)
}

function getCameraList (index) {
  // Build list of cameras
  if (index === '*') {
    return camAPI.cameraBrowser.getCameras()
  }

  return new camAPI.Camera(index)
}

/**
 * Read and return camera image properties (will trigger a shutter release)
 * @param {number} index The zero-based index of the camera to take a picture on
 * @returns {Promise} Resolves to the exposure and image properties from a test photo.
 */
export function determineImageProperties (index) {
  return new Promise((resolve, reject) => {
    try {
      const cam = getCameraList(index)
      if (cam) {
        // Set to download to host
        const oldProps = getProperties(cam, ['SaveTo', 'ImageQuality'])
        setCameraPropertiesForOne(index, { ImageQuality: 'Small1JPEGNormal' })
        setCameraPropertiesForOne(index, { SaveTo: 'Host' })
        prepareToReceiveExposureInfo(exposureInfo => {
          // Reset back to original value
          setCameraPropertiesForOne(index, { ImageQuality: trimProp(oldProps.ImageQuality.label) })
          setCameraPropertiesForOne(index, { SaveTo: trimProp(oldProps.SaveTo.label) })

          // Return info
          if (exposureInfo.error) {
            return reject(new CameraAPIError(400, null, exposureInfo.message))
          }
          return resolve(exposureInfo)
        })

        // Take picture
        cam.sendCommand(camAPI.Camera.Command.PressShutterButton, camAPI.Camera.PressShutterButton.CompletelyNonAF)
        cam.sendCommand(camAPI.Camera.Command.PressShutterButton, camAPI.Camera.PressShutterButton.OFF)
      } else {
        return reject(new CameraAPIError(404, null, `Camera ${index} not found`))
      }
    } catch (e) {
      if (e instanceof CameraAPIError) {
        return reject(e)
      } else if (e.message.includes('DEVICE_NOT_FOUND')) {
        return reject(new CameraAPIError(404, null, `Camera ${index} not found`))
      } else {
        return reject(new CameraAPIError(500, null, `Failed to read image propeties for camera ${index}`, { cause: e }))
      }
    }
  })
}

/**
 * Try to reset the camera back to a clean state ready to take a picture.
 * @param {number} index The zero-based index of the camera to take a picture on
 */
export function resetOne (index) {
  try {
    const cam = getCameraList(index)
    cam.connect()
    cam.stopLiveView()
    cam.sendCommand(camAPI.Camera.Command.PressShutterButton, camAPI.Camera.PressShutterButton.OFF)
  } catch (e) {
    if (e instanceof CameraAPIError) {
      throw e
    } else if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, null, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(500, null, `Failed to reset camera ${index}`, { cause: e })
    }
  }
}

/**
 * Try to reset all the cameras back to a clean state ready to take a picture.
 * @returns {string} The ID of the associated bulk task which will complete asynchronously
 */
export function resetAll () {
  const camList = getCameraList('*')
  const resultsPromise = Promise.allSettled(camList.map(cam => {
    return new Promise((resolve, reject) => {
      runSoon(() => {
        try {
          cam.connect()
          cam.stopLiveView()
          cam.sendCommand(camAPI.Camera.Command.PressShutterButton, camAPI.Camera.PressShutterButton.OFF)
          return resolve()
        } catch (err) {
          return reject(err)
        }
      })
    })
  }))

  return createBulkTask(resultsPromise, 'Reset')
}

/**
 * Instruct a camera to take a picture (may trigger an image download if save-to is set to HOST)
 * @param {number} index The zero-based index of the camera to take a picture on
 */
export function takePictureForOne (index) {
  try {
    const cam = getCameraList(index)
    cam.connect()
    cam.takePicture()
  } catch (e) {
    if (e instanceof CameraAPIError) {
      throw e
    } else if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, null, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(500, null, `Failed to trigger shutter for camera ${index}`, { cause: e })
    }
  }
}

/**
 * Instruct all cameras to take a picture (may trigger image downloads if save-to is set to HOST)
 * @returns {string} A unique identifier for the task (which completes later)
 */
export function takePictureForAll () {
  const camList = getCameraList('*')
  const resultsPromise = Promise.allSettled(camList.map(cam => {
    return new Promise((resolve, reject) => {
      runSoon(() => {
        try {
          cam.connect()
          cam.takePicture()
          return resolve()
        } catch (err) {
          return reject(err)
        }
      })
    })
  }))

  return createBulkTask(resultsPromise, 'Bulk photo capture')
}

/**
 * Simulate pressing the shutter button on the camera
 * @param {number} index The zero-based index of the camera to press the shutter for
 * @param {boolean} halfway Press the shutter button only halfway (triggers auto-focus)
 */
export function pressShutterButtonForOne (index, halfway = false) {
  const pressType = (halfway ? camAPI.Camera.PressShutterButton.Halfway : camAPI.Camera.PressShutterButton.CompletelyNonAF)
  try {
    const cam = getCameraList(index)
    cam.connect()
    cam.sendCommand(camAPI.Camera.Command.PressShutterButton, pressType)
    cam.sendCommand(camAPI.Camera.Command.PressShutterButton, camAPI.Camera.PressShutterButton.OFF)
  } catch (e) {
    if (e instanceof CameraAPIError) {
      throw e
    } else if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, null, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(500, null, `Failed to press shutter button ${halfway ? 'halfway ' : ''}for camera ${index}`, { cause: e })
    }
  }
}

/**
 * Simulate pressing the shutter button on all cameras
 * @param {boolean} halfway Press the shutter button only halfway (triggers auto-focus)
 * @returns {string} A unique identifier for the task (which completes later)
 */
export function pressShutterButtonForAll (halfway = false) {
  const pressType = (halfway ? camAPI.Camera.PressShutterButton.Halfway : camAPI.Camera.PressShutterButton.CompletelyNonAF)
  const camList = getCameraList('*')
  const resultsPromise = Promise.allSettled(camList.map(cam => {
    return new Promise((resolve, reject) => {
      runSoon(() => {
        try {
          cam.connect()
          cam.sendCommand(camAPI.Camera.Command.PressShutterButton, pressType)
          cam.sendCommand(camAPI.Camera.Command.PressShutterButton, camAPI.Camera.PressShutterButton.OFF)
          // cam.disconnect()
          return resolve()
        } catch (err) {
          return reject(err)
        }
      })
    })
  }))

  return createBulkTask(resultsPromise, halfway ? 'Bulk auto-focus' : 'Bulk shutter Release')
}

/**
 * Retrieve an array of basic info for each connected camera
 * @returns {Object[]} Basic info for each connected camera
 */
export function getCameraSummaryList () {
  // Get camera list
  camAPI.cameraBrowser.update()
  const camList = camAPI.cameraBrowser.getCameras()

  // Convert each camera to just its basic summary info
  const cameras = camList.map((_, i) => {
    try {
      const info = getCameraInfo(i)
      return info
    } catch (error) {
      log.error(`Error getting camera info: ${error.message}`)
      return null
    }
  }).filter(info => info !== null)

  // Refresh lookup lists and return camera list
  SNList = cameras.map(cam => cam.BodyIDEx.value)
  portList = cameras.map(cam => cam.portName)
  return cameras
}

/**
 * Retrieve information about one camera (summary or full info)
 * @param {number} index Which camera to query (zero-based index)
 * @param {boolean} summary Should this just be a summary or FULL camera info?
 * @returns {Object} Info about the camera (varies based on value of 'summary')
 */
export function getCameraInfo (index, summary = true) {
  // Connect to camera
  try {
    const curCam = new camAPI.Camera(index)
    curCam.connect()
    const props = getProperties(curCam, summary ? SUMMARY_PROPS : FULL_PROPS)
    // curCam.disconnect()
    return { index, portName: curCam.portName, ...props }
  } catch (e) {
    log.error(`Error getting properties: ${e.message}`)
    throw new CameraAPIError(404, null, `Camera ${index} not found`)
  }
}

/**
 * Attempt to read the value of one specific property for a specific camera.
 * @param {number} index Zero-based index of the camera to query
 * @param {string} propID The specific property to query
 * @returns {Object} Information about the specified property or null
 */
export function getCameraProperty (index, propID) {
  let cam = null
  try {
    cam = new camAPI.Camera(index)
    cam.connect()
    const prop = cam.getProperty(camAPI.CameraProperty.ID[propID])
    // cam.disconnect()
    if (prop.available) {
      return prop
    }
    throw new CameraAPIError(400, null, `Property not available: ${propID}`)
  } catch (e) {
    if (e instanceof CameraAPIError) {
      throw e
    } else if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, null, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(400, null, `Failed to retrieve property: ${propID}`, { cause: e })
    }
  }
}

function getProperties (cam, propList) {
  const props = {}
  propList.forEach((key) => {
    try {
      const prop = cam.getProperty(camAPI.CameraProperty.ID[key])
      if (prop.available) {
        props[key] = {
          label: prop.value?.label,
          value: prop.value?.value === undefined ? prop.value : prop.value.value
        }

        // Detect time values
        if ((props[key].label === null || props[key].label === undefined) &&
            typeof props[key].value?.year === 'number') {
          props[key].label = new Date(Date.UTC(
            props[key].value.year,
            props[key].value.month - 1,
            props[key].value.day,
            props[key].value.hour,
            props[key].value.minute,
            props[key].value.second
          ))
        }
      } else {
        log.error(`Property not available: ${key}`)
      }
    } catch (e) {
      throw new CameraAPIError(400, null, `Failed to retrieve property: ${key}`, { cause: e })
    }
  })
  return props
}

function buildPropertiesObject (settingsObj) {
  const newProperties = {}
  Object.keys(settingsObj).forEach(identifier => {
    const valueOrLabel = settingsObj[identifier]
    switch (identifier.toLowerCase()) {
      case 'av':
      case 'aperture': {
        const value = camAPI.Aperture.forLabel(valueOrLabel)?.value
        if (!value) { throw new CameraAPIError(400, null, `Unknown aperture value: ${valueOrLabel}`) }
        newProperties[camAPI.CameraProperty.ID.Av] = value
      } break

      case 'tv':
      case 'shutterspeed': {
        const value = camAPI.ShutterSpeed.forLabel(valueOrLabel)?.value
        if (!value) { throw new CameraAPIError(400, null, `Unknown shutter speed value: ${valueOrLabel}`) }
        newProperties[camAPI.CameraProperty.ID.Tv] = value
      } break

      case 'iso':
      case 'isospeed':
      case 'isosensitivity': {
        const value = camAPI.ISOSensitivity.forLabel(valueOrLabel)?.value
        if (typeof value !== 'number') {
          throw new CameraAPIError(400, null, `Unknown ISO value: ${valueOrLabel}`)
        }
        newProperties[camAPI.CameraProperty.ID.ISOSpeed] = value
      } break

      case 'imagequality': {
        const value = camAPI.ImageQuality.ID[valueOrLabel]
        if (typeof value !== 'number') {
          throw new CameraAPIError(400, null, `Unknown Image Quality value: ${valueOrLabel}`)
        }
        newProperties[camAPI.CameraProperty.ID.ImageQuality] = value
      } break

      case 'exposure':
      case 'exposurecompensation': {
        const value = camAPI.ExposureCompensation.forLabel(valueOrLabel)?.value
        if (typeof value !== 'number') {
          throw new CameraAPIError(400, null, `Unknown Exposure Compensation value: ${valueOrLabel}`)
        }
        newProperties[camAPI.CameraProperty.ID.ExposureCompensation] = value
      } break

      // NOTE: Use the computeTZValue() function to help
      case 'timezone':
        newProperties[camAPI.CameraProperty.ID.TimeZone] = new camAPI.TimeZone(valueOrLabel)
        break

      // Assume anything else is an 'Option'
      default: {
        let value = valueOrLabel
        if (typeof value === 'string') {
          value = camAPI.Option[identifier]?.[valueOrLabel]
          if (typeof value !== 'number') {
            throw new CameraAPIError(400, null, `Unknown property (${identifier}) or value: ${valueOrLabel}`)
          }
        }
        newProperties[camAPI.CameraProperty.ID[identifier]] = value
      } break
    }
  })
  return newProperties
}

export function setCameraPropertyForOne (index, identifier, value) {
  return setCameraPropertiesForOne(index, { [identifier]: value })
}

export function setCameraPropertyForAll (identifier, value, type = 'Bulk property change') {
  return setCameraPropertiesForAll({ [identifier]: value }, type)
}

export function setCameraPropertiesForOne (index, settingsObj) {
  // Build properties object
  const newProperties = buildPropertiesObject(settingsObj)

  // Attempt to set properties
  try {
    const cam = getCameraList(index)
    cam.connect()
    cam.setProperties(newProperties)
  } catch (e) {
    if (e instanceof CameraAPIError) {
      throw e
    } else if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, null, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(500, null, 'Internal SDK Error', { cause: e })
    }
  }
}

function compareProperties (cam, settingsObj) {
  cam.connect()
  const compareKeys = Object.keys(settingsObj)
  const cameraProperties = getProperties(cam, compareKeys)
  const nonMatches = []

  compareKeys.forEach((key) => {
    if (cameraProperties[key].label instanceof Date) {
      const timeNoMS = settingsObj[key].getTime() - settingsObj[key].getUTCMilliseconds()
      if (timeNoMS !== cameraProperties[key].label.getTime()) {
        log.error(`Date/Time Mismatch: ${timeNoMS} !== ${cameraProperties[key].label.getTime()}`)
        nonMatches.push(key)
      }
    } else {
      if (settingsObj[key] !== trimProp(cameraProperties[key].label)) {
        log.error(`Mismatch: ${settingsObj[key]} !== ${trimProp(cameraProperties[key].label)}`)
        nonMatches.push(key)
      }
    }
  })

  return nonMatches
}

export function setCameraPropertiesForAll (settingsObj, type = 'Bulk property change') {
  // Build properties object
  const newProperties = buildPropertiesObject(settingsObj)

  // Attempt to set properties
  const camList = getCameraList('*')
  const resultsPromise = Promise.allSettled(camList.map(cam => {
    return new Promise((resolve, reject) => {
      runSoon(() => {
        try {
          cam.connect()
          cam.setProperties(newProperties)
          const mismatchedProps = compareProperties(cam, settingsObj)
          if (mismatchedProps.length > 0) {
            return resolve({
              error: true,
              message: `Properties failed to set: ${mismatchedProps.toString()}`
            })
          }
          return resolve()
        } catch (err) {
          return reject(err)
        }
      })
    })
  }))

  return createBulkTask(resultsPromise, type)
}

export function computeTZValue (tzString, tzOffset) {
  let standardName = searchTZNames(tzString)
  if (!standardName) {
    standardName = searchTZNames(tzLookup[tzOffset.toString()])
  }

  if (!standardName) {
    throw new CameraAPIError(400, null, `Could not match timezone ${tzString} and/or offset ${tzOffset}`)
  }

  return magicTZValue[standardName]
}

function searchTZNames (tzString) {
  if (!tzString) return undefined

  const key = Object.keys(camAPI.TimeZone.Zones).find(
    zoneVal => {
      const strZone = camAPI.TimeZone.Zones[zoneVal]
      return tzString.toLowerCase().includes(strZone.toLowerCase())
    }
  )

  if (key) { return camAPI.TimeZone.Zones[key] }
  return undefined
}

/* eslint-disable quote-props */
const tzLookup = {
  '765': 'Chatham Islands',
  '720': 'Wellington',
  '660': 'Solomon Island',
  '600': 'Sydney',
  '570': 'Adeladie',
  '540': 'Tokyo',
  '480': 'Hong Kong',
  '420': 'Bangkok',
  '390': 'Yangon',
  '360': 'Dacca',
  '345': 'Kathmandu',
  '330': 'Delhi',
  '300': 'Karachi',
  '270': 'Kabul',
  '240': 'Dubai',
  '210': 'Tehran',
  '180': 'Moscow',
  '120': 'Cairo',
  '60': 'Paris',
  '0': 'London',
  '-60': 'Azores',
  '-120': 'Fernando de Noronha',
  '-180': 'São Paulo',
  '-210': 'Newfoundland',
  '-240': 'Santiago',
  '-270': 'Caracas',
  '-300': 'New York',
  '-360': 'Chicago',
  '-420': 'Denver',
  '-480': 'Los Angeles',
  '-540': 'Anchorage',
  '-600': 'Honolulu',
  '780': 'Samoa'
}

const magicTZValue = {
  'None': 0x00000000,
  'Chatham Islands': 0x000102FD,
  'Wellington': 0x000202D0,
  'Solomon Island': 0x00030294,
  'Sydney': 0x00040258,
  'Adeladie': 0x0005023A,
  'Tokyo': 0x0006021C,
  'Hong Kong': 0x000701E0,
  'Bangkok': 0x000801A4,
  'Yangon': 0x00090186,
  'Dacca': 0x000A0168,
  'Kathmandu': 0x000B0159,
  'Delhi': 0x000C014A,
  'Karachi': 0x000D012C,
  'Kabul': 0x000E010E,
  'Dubai': 0x000F00F0,
  'Tehran': 0x001000D2,
  'Moscow': 0x001100B4,
  'Cairo': 0x00120078,
  'Paris': 0x0013003C,
  'London': 0x00140000,
  'Azores': 0x0015FFC4,
  'Fernando de Noronha': 0x0016FF88,
  'São Paulo': 0x0017FF4C,
  'Newfoundland': 0x0018FF2E,
  'Santiago': 0x0019FF10,
  'Caracas': 0x001AFEF2,
  'New York': 0x001BFED4,
  'Chicago': 0x001CFE98,
  'Denver': 0x001DFE5C,
  'Los Angeles': 0x001EFE20,
  'Anchorage': 0x001FFDE4,
  'Honolulu': 0x0020FDA8,
  'Samoa': 0x0021030C,
  'Riyadh': 0x002200B4,
  'Manaus': 0x0023FF10,
  'UTC': 0x01000000
}
