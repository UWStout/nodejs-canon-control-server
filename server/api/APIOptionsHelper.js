import camAPI from '@dimensional/napi-canon-cameras'

const ALLOWED_AE_MODES = [
  'ProgramAE',
  'Tv',
  'Av',
  'Manual',
  'Bulb',
  'Custom',
  'Sports',
  'Portrait',
  'Landscape',
  'Closeup',
  'CreativeAuto',
  'Movie',
  'SceneIntelligentAuto'
]

const ALLOWED_EXPOSURE_COMP_VALUES = [
  216,
  219,
  220,
  221,
  224,
  227,
  228,
  229,
  232,
  235,
  236,
  237,
  240,
  243,
  244,
  245,
  248,
  251,
  252,
  253,
  0,
  3,
  4,
  5,
  8,
  11,
  12,
  13,
  16,
  19,
  20,
  21,
  24,
  27,
  28,
  29,
  32,
  35,
  36,
  37,
  40
]

export function getAEModeValues () {
  return ALLOWED_AE_MODES.map(
    (key) => ({ label: key, value: camAPI.Option.AEMode[key] })
  )
}

export function getExposureCompValues () {
  return ALLOWED_EXPOSURE_COMP_VALUES.map(
    (value) => {
      const ev = new camAPI.ExposureCompensation(value)
      switch (ev.label) {
        case ' 1/3': case ' 1/2': case ' 2/3':
          return {
            value: ev.value,
            label: (ev.value > 200 ? '-' : '+') + ev.label.trimStart(),
            compensation: ev.compensation
          }

        default:
          return ev
      }
    }
  )
}
