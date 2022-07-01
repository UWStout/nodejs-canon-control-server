export default class RESTAPIError extends Error {
  constructor (status = 500, ...rest) {
    super(...rest)
    this.status = status
  }
}

RESTAPIError.respond = (err, res, log = console, extraData = {}) => {
  if (!err) {
    log.error('RESTAPIError.respond called with undefined error object')
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
    ...extraData
  })
}
