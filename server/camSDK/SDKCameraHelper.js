import camSDK from '@dimensional/napi-canon-cameras'
import RESTAPIError from '../RESTApi/RESTAPIError.js'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'APIDevice')

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
  'PictureStyleDesc',

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

function getCameraList (index) {
  // Build list of cameras
  if (index === '*') {
    return camSDK.cameraBrowser.getCameras()
  }

  return [new camSDK.Camera(index)]
}

/**
 * Instruct a camera to take a picture (may trigger an image download if save-to is set to HOST)
 * @param {number} index The zero-based index of the camera to trigger the shutter for
 */
export async function takePicture (index) {
  try {
    const camList = getCameraList(index)
    await Promise.allSettled(camList.map(cam => {
      return new Promise((resolve, reject) => {
        try {
          cam.takePicture()
          return resolve()
        } catch (err) {
          return reject(err)
        }
      })
    }))
  } catch (e) {
    if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new RESTAPIError(404, `Camera ${index} not found`)
    } else {
      throw new RESTAPIError(500, `Failed to trigger shutter for camera ${index}`, { cause: e })
    }
  }
}

/**
 * Simulate pressing the shutter button on the camera
 * @param {number} index The zero-based index of the camera to press the shutter for
 * @param {boolean} halfway Press the shutter button only halfway (triggers auto-focus)
 */
export async function pressShutterButton (index, halfway = false) {
  const pressType = (halfway ? camSDK.Camera.PressShutterButton.Halfway : camSDK.Camera.PressShutterButton.CompletelyNonAF)
  try {
    const camList = getCameraList(index)
    await Promise.allSettled(camList.map(cam => {
      return new Promise((resolve, reject) => {
        try {
          cam.sendCommand(camSDK.Camera.Command.PressShutterButton, pressType)
          cam.sendCommand(camSDK.Camera.Command.PressShutterButton, camSDK.Camera.PressShutterButton.OFF)
          return resolve()
        } catch (err) {
          return reject(err)
        }
      })
    }))
  } catch (e) {
    if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new RESTAPIError(404, `Camera ${index} not found`)
    } else {
      throw new RESTAPIError(500, `Failed to press shutter button ${halfway ? 'halfway ' : ''}for camera ${index}`, { cause: e })
    }
  }
}

/**
 * Retrieve an array of basic info for each connected camera
 * @returns {Object[]} Basic info for each connected camera
 */
export function getCameraSummaryList () {
  // Get camera list
  camSDK.cameraBrowser.update()
  const camList = camSDK.cameraBrowser.getCameras()

  // Convert each camera to just its basic summary info
  const cameras = camList.map((_, i) => getCameraInfo(i))

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
    const curCam = new camSDK.Camera(index)
    curCam.connect()
    const props = getProperties(curCam, summary ? SUMMARY_PROPS : FULL_PROPS)
    // curCam.disconnect()
    return { index, portName: curCam.portName, ...props }
  } catch (e) {
    log.error(`Error getting properties: ${e.message}`)
    throw new RESTAPIError(404, `Camera ${index} not found`)
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
    cam = new camSDK.Camera(index)
    cam.connect()
    const prop = cam.getProperty(camSDK.CameraProperty.ID[propID])
    // cam.disconnect()
    if (prop.available) {
      return prop
    }
    throw new RESTAPIError(400, `Property not available: ${propID}`)
  } catch (e) {
    // if (cam) { cam.disconnect() }
    if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new RESTAPIError(404, `Camera ${index} not found`)
    } else {
      throw new RESTAPIError(400, `Failed to retrieve property: ${propID}`, { cause: e })
    }
  }
}

function getProperties (cam, propList) {
  const props = {}
  propList.forEach((key) => {
    try {
      const prop = cam.getProperty(camSDK.CameraProperty.ID[key])
      if (prop.available) {
        props[key] = {
          label: prop.value?.label,
          value: prop.value?.value === undefined ? prop.value : prop.value.value
        }
      } else {
        log.error(`Property not available: ${key}`)
      }
    } catch (e) {
      throw new RESTAPIError(400, `Failed to retrieve property: ${key}`, { cause: e })
    }
  })
  return props
}

export function setCameraProperty (index, identifier, valueOrLabel) {
  // Build properties object
  const newProperties = {}
  switch (identifier.toLowerCase()) {
    case 'av':
    case 'aperture': {
      const value = camSDK.Aperture.forLabel(valueOrLabel)?.value
      if (!value) { throw new RESTAPIError(400, `Unknown aperture value: ${valueOrLabel}`) }
      newProperties[camSDK.CameraProperty.ID.Av] = value
    } break

    case 'tv':
    case 'shutterspeed': {
      const value = camSDK.ShutterSpeed.forLabel(valueOrLabel)?.value
      if (!value) { throw new RESTAPIError(400, `Unknown shutter speed value: ${valueOrLabel}`) }
      newProperties[camSDK.CameraProperty.ID.Tv] = value
    } break

    case 'iso':
    case 'isosensitivity': {
      const value = camSDK.ISOSensitivity.forLabel(valueOrLabel)?.value
      if (!value) { throw new RESTAPIError(400, `Unknown ISO value: ${valueOrLabel}`) }
      newProperties[camSDK.CameraProperty.ID.ISOSensitivity] = value
    } break

    case 'imagequality': {
      const value = camSDK.ImageQuality.ID[valueOrLabel]
      if (!value) { throw new RESTAPIError(400, `Unknown Image Quality value: ${valueOrLabel}`) }
      newProperties[camSDK.CameraProperty.ID.ImageQuality] = value
    } break

    case 'exposure':
    case 'exposurecompensation': {
      const value = camSDK.ExposureCompensation.forLabel(valueOrLabel).value
      if (!value) { throw new RESTAPIError(400, `Unknown Exposure Compensation value: ${valueOrLabel}`) }
      newProperties[camSDK.CameraProperty.ID.ExposureCompensation] = value
    } break

    // NOTE: Use the computeTZValue() function to help
    case 'timezone':
      newProperties[camSDK.CameraProperty.ID.TimeZone] = new camSDK.TimeZone(valueOrLabel)
      break

    // Assume anything else is an 'Option'
    default: {
      let value = valueOrLabel
      if (typeof value === 'string') {
        value = camSDK.Option[identifier]?.[valueOrLabel]
        if (!value) { throw new RESTAPIError(400, `Unknown property (${identifier}) or value: ${valueOrLabel}`) }
      }
      newProperties[camSDK.CameraProperty.ID[identifier]] = value
    } break
  }

  // Attempt to set property
  try {
    const camList = getCameraList(index)
    camList.forEach(cam => {
      cam.connect()
      cam.setProperties(newProperties)
      // cam.disconnect()
    })
    return true
  } catch (e) {
    if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new RESTAPIError(404, `Camera ${index} not found`)
    } else {
      throw new RESTAPIError(500, 'Internal SDK Error', { cause: e })
    }
  }
}

export function computeTZValue (tzString, tzOffset) {
  let standardName = searchTZNames(tzString)
  if (!standardName) {
    standardName = searchTZNames(tzLookup[tzOffset.toString()])
  }

  if (!standardName) {
    throw new RESTAPIError(400, `Could not match timezone ${tzString} and/or offset ${tzOffset}`)
  }

  return magicTZValue[standardName]
}

function searchTZNames (tzString) {
  if (!tzString) return undefined

  const key = Object.keys(camSDK.TimeZone.Zones).find(
    zoneVal => {
      const strZone = camSDK.TimeZone.Zones[zoneVal]
      return tzString.toLowerCase().includes(strZone.toLowerCase())
    }
  )

  if (key) { return camSDK.TimeZone.Zones[key] }
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
