import camAPI from '@dimensional/napi-canon-cameras'

export function getApertureValues () {
  return Object.keys(camAPI.Aperture.Values).map(
    (value) => {
      const aperture = new camAPI.Aperture(+value)
      return aperture.label
    }
  ).sort((a, b) => +a[1] - +b[1])
}

export function getShutterSpeedValues () {
  return Object.keys(camAPI.ShutterSpeed.Values).map(
    (value) => {
      const speed = new camAPI.ShutterSpeed(+value)
      return speed.label
    }
  ).sort((a, b) => +a[1] - +b[1])
}

export function getISOValues () {
  return Object.keys(camAPI.ISOSensitivity.Values).map(
    (value) => (new camAPI.ISOSensitivity(+value).label)
  ).sort((a, b) => +a[0] - +b[0])
}

export function getWhiteBalanceValues () {
  return Object.keys(camAPI.Option.WhiteBalance)
    .sort((a, b) => a[0].localeCompare(b[0]))
}
