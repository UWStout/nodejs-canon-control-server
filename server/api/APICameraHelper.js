import camAPI from '@dimensional/napi-canon-cameras'

// Properties included for summary
const SUMMARY_PROPS = {
  ProductName: camAPI.CameraProperty.ID.ProductName,
  BodyIDEx: camAPI.CameraProperty.ID.BodyIDEx
}

// All properties included
const FULL_PROPS = {
  // Base properties
  ProductName: camAPI.CameraProperty.ID.ProductName,
  BodyIDEx: camAPI.CameraProperty.ID.BodyIDEx,
  OwnerName: camAPI.CameraProperty.ID.OwnerName,
  DateTime: camAPI.CameraProperty.ID.DateTime,
  FirmwareVersion: camAPI.CameraProperty.ID.FirmwareVersion,
  BatteryLevel: camAPI.CameraProperty.ID.BatteryLevel,
  SaveTo: camAPI.CameraProperty.ID.SaveTo,
  CurrentStorage: camAPI.CameraProperty.ID.CurrentStorage,
  MyMenu: camAPI.CameraProperty.ID.MyMenu,

  // Image Properties
  ImageQuality: camAPI.CameraProperty.ID.ImageQuality,
  WhiteBalance: camAPI.CameraProperty.ID.WhiteBalance,
  WhiteBalanceShift: camAPI.CameraProperty.ID.WhiteBalanceShift,
  ColorSpace: camAPI.CameraProperty.ID.ColorSpace,
  PictureStyle: camAPI.CameraProperty.ID.PictureStyle,
  PictureStyleDesc: camAPI.CameraProperty.ID.PictureStyleDescription,

  // Capture Properties
  AEMode: camAPI.CameraProperty.ID.AEMode,
  DriveMode: camAPI.CameraProperty.ID.DriveMode,
  ISOSpeed: camAPI.CameraProperty.ID.ISOSpeed,
  MeteringMode: camAPI.CameraProperty.ID.MeteringMode,
  AFMode: camAPI.CameraProperty.ID.AFMode,
  Av: camAPI.CameraProperty.ID.Av,
  Tv: camAPI.CameraProperty.ID.Tv,
  ExposureCompensation: camAPI.CameraProperty.ID.ExposureCompensation,
  AvailableShots: camAPI.CameraProperty.ID.AvailableShots,
  Bracket: camAPI.CameraProperty.ID.Bracket,
  LensName: camAPI.CameraProperty.ID.LensName,
  AEBracket: camAPI.CameraProperty.ID.AEBracket,
  LensStatus: camAPI.CameraProperty.ID.LensStatus,
  Artist: camAPI.CameraProperty.ID.Artist,
  Copyright: camAPI.CameraProperty.ID.Copyright,
  AEModeSelect: camAPI.CameraProperty.ID.AEModeSelect
}

export function getCameraSummaryList () {
  // Get camera list
  camAPI.cameraBrowser.update()
  const camList = camAPI.cameraBrowser.getCameras()

  // Convert each camera to just its basic summary info
  const cameras = camList.map((_, i) => getCameraInfo(i))
  return cameras
}

export function getCameraInfo (index, summary = true) {
  // Connect to camera
  const curCam = new camAPI.Camera(index)
  if (curCam) {
    curCam.connect()
    return {
      index,
      ...getProperties(curCam, summary ? SUMMARY_PROPS : FULL_PROPS)
    }
  }

  // Couldn't connect
  return {}
}

function getProperties (cam, propObject) {
  const props = {}
  Object.keys(propObject).forEach((key) => {
    try {
      const prop = cam.getProperty(propObject[key]).value
      props[key] = {
        label: prop.label,
        value: prop.value === undefined ? prop : prop.value
      }
    } catch (e) {
      console.error('Failed to get property:', key)
    }
  })
  return props
}
