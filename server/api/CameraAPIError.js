export default class CameraAPIError extends Error {
  constructor (status = 500, ...rest) {
    super(...rest)
    this.status = status
  }
}

CameraAPIError.respond = (err, res, extraData) => {
  if (!err) {
    console.error('CameraAPIError.respond called with undefined error object')
    return
  }

  // Log generic SDK errors and internal errors
  if (!err.status || err.status === 500) {
    console.error(err.message)
    if (err.cause) {
      console.error(err.cause.message)
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
