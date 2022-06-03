import camAPI from '@dimensional/napi-canon-cameras'
import CameraAPIError from './CameraAPIError.js'

// Properties included for summary
const SUMMARY_PROPS = [
  'ProductName',
  'BodyIDEx',
  'AEMode',
  'DriveMode',
  'ISOSpeed',
  'MeteringMode',
  'AFMode',
  'Av',
  'Tv',
  'ExposureCompensation'
]

// All properties included
const FULL_PROPS = [
  // Base properties
  'ProductName',
  'BodyIDEx',
  'OwnerName',
  'DateTime',
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

/**
 * Retrieve an array of basic info for each connected camera
 * @returns {Object[]} Basic info for each connected camera
 */
export function getCameraSummaryList () {
  // Get camera list
  camAPI.cameraBrowser.update()
  const camList = camAPI.cameraBrowser.getCameras()

  // Convert each camera to just its basic summary info
  const cameras = camList.map((_, i) => getCameraInfo(i))
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
    curCam.disconnect()
    return { index, ...props }
  } catch (e) {
    throw new CameraAPIError(404, `Camera ${index} not found`)
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
    cam.disconnect()
    if (prop.available) {
      return prop
    }
    throw new CameraAPIError(400, `Property not available: ${propID}`)
  } catch (e) {
    if (cam) { cam.disconnect() }
    if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(400, `Failed to retrieve property: ${propID}`, { cause: e })
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
      } else {
        console.error('Property not available:', key)
      }
    } catch (e) {
      throw new CameraAPIError(400, `Failed to retrieve property ${key}`, { cause: e })
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
      const value = camAPI.Aperture.forLabel(valueOrLabel)?.value
      if (!value) { throw new CameraAPIError(400, `Unknown aperture value: ${valueOrLabel}`) }
      newProperties[camAPI.CameraProperty.ID.Av] = value
    } break

    case 'tv':
    case 'shutterspeed': {
      const value = camAPI.ShutterSpeed.forLabel(valueOrLabel)?.value
      if (!value) { throw new CameraAPIError(400, `Unknown shutter speed value: ${valueOrLabel}`) }
      newProperties[camAPI.CameraProperty.ID.Tv] = value
    } break

    case 'iso':
    case 'isosensitivity': {
      const value = camAPI.ISOSensitivity.forLabel(valueOrLabel)?.value
      if (!value) { throw new CameraAPIError(400, `Unknown ISO value: ${valueOrLabel}`) }
      newProperties[camAPI.CameraProperty.ID.ISOSensitivity] = value
    } break

    case 'imagequality': {
      const value = camAPI.ImageQuality.ID[valueOrLabel]
      if (!value) { throw new CameraAPIError(400, `Unknown Image Quality value: ${valueOrLabel}`) }
      newProperties[camAPI.CameraProperty.ID.ImageQuality] = value
    } break

    // Assume anything else is an 'Option'
    default: {
      const value = camAPI.Option[identifier]?.[valueOrLabel]
      if (!value) { throw new CameraAPIError(400, `Unknown property (${identifier}) or value: ${valueOrLabel}`) }
      newProperties[camAPI.CameraProperty.ID[identifier]] = value
    } break
  }

  // Attempt to set property
  let cam = null
  try {
    cam = new camAPI.Camera(index)
    cam.connect()
    cam.setProperties(newProperties)
    cam.disconnect()
    return true
  } catch (e) {
    if (cam) { cam.disconnect() }
    if (e.message.includes('DEVICE_NOT_FOUND')) {
      throw new CameraAPIError(404, `Camera ${index} not found`)
    } else {
      throw new CameraAPIError(500, 'Internal SDK Error', { cause: e })
    }
  }
}
