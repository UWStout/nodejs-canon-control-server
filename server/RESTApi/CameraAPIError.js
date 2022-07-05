export default class CameraAPIError extends Error {
  constructor (status = 500, results = {}, ...rest) {
    super(...rest)
    this.status = status
    this.results = results
  }
}

CameraAPIError.respond = (err, res, log = console, extraData = {}) => {
  if (!err) {
    log.error('CameraAPIError.respond called with undefined error object')
    return
  }

  // Log generic SDK errors and internal errors
  if (!err.status || err.status === 500) {
    log.error(err.message)
    if (err.cause) {
      log.error(err.cause.message)
    }
  }

  // Respond to the request
  res.status(err.status || 500).json({
    error: true,
    message: err.message,
    cause: err.cause?.message,
    results: err.results || undefined,
    ...extraData
  })
}
