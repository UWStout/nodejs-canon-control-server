// System libraries
import path from 'path'

// Bring in Winston logging utilities
import * as winston from 'winston'
import { format } from 'logform'
import LogzioWinstonTransport from 'winston-logzio'
import ExpressWinston from 'express-winston'
import 'winston-daily-rotate-file'

// Read extra environment variables from the .env file
import dotenv from 'dotenv'

// Read in secret tokens and config
dotenv.config()
const HOST_NICKNAME = process.env.HOST_NICKNAME || 'unknown'
const LOGZIO_TOKEN = process.env.LOGZIO_TOKEN || 'bad-token'
const LOGZIO_LISTENER = process.env.LOGZIO_LISTENER || 'nowhere.com'

// Catch command line options
const _DEV_ = process.argv.find((arg) => (arg.toLowerCase() === 'dev' || arg.toLowerCase() === 'development'))
const verbose = process.argv.find((arg) => (arg.toLowerCase() === 'verbose'))

// Special format to add the host nickname
const serverName = format((info, opts) => {
  if (opts.serverName) {
    info.serverName = opts.serverName
  }
  return info
})

// Different formats for different log transports
const formatBase = [
  winston.format.timestamp(),
  winston.format.ms(),
  winston.format.padLevels(),
  winston.format.printf(info => `${info.timestamp} ${info.ms.padEnd(8, ' ')} ${`[${info.label}]`.padEnd(25, ' ')} ${info.level} ${info.message}`)
]
const humanTextLogFormat = (colorize = true) => (
  (colorize
    ? winston.format.combine(winston.format.colorize(), ...formatBase)
    : winston.format.combine(...formatBase)
  )
)

const jsonLogFormat = winston.format.json()

// Console Transport
const consoleTransport = new winston.transports.Console({
  level: 'info',
  format: humanTextLogFormat(true)
})

// Logz.io Transport
const logzioWinstonTransport = new LogzioWinstonTransport({
  level: 'info',
  name: 'winston_logzio',
  token: LOGZIO_TOKEN,
  host: LOGZIO_LISTENER,
  format: jsonLogFormat
})

// Daily rotating file transport
const rotateFileSharedConfig = {
  level: (verbose ? 'verbose' : 'info'),
  datePattern: 'MM-DD-YYYY',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d'
}

// Local rotating file for 'info' and higher messages
const infoFileJsonTransport = new winston.transports.DailyRotateFile({
  ...rotateFileSharedConfig,
  filename: path.join('log', '%DATE%-info-json.log'),
  format: jsonLogFormat
})

const infoFileTextTransport = new winston.transports.DailyRotateFile({
  ...rotateFileSharedConfig,
  filename: path.join('log', '%DATE%-info-txt.log'),
  format: humanTextLogFormat(false)
})

// Local rotating file for 'error' messages only
const errorFileJsonTransport = new winston.transports.DailyRotateFile({
  ...rotateFileSharedConfig,
  level: 'error',
  filename: path.join('log', '%DATE%-error-json.log'),
  format: jsonLogFormat
})

const errorFileTextTransport = new winston.transports.DailyRotateFile({
  ...rotateFileSharedConfig,
  level: 'error',
  filename: path.join('log', '%DATE%-error-txt.log'),
  format: humanTextLogFormat(false)
})

// All common file transports
const allFileTransports = [
  infoFileJsonTransport,
  infoFileTextTransport,
  errorFileJsonTransport,
  errorFileTextTransport
]

// Construct a logger config with our intended format and transports
const makeConfig = (label) => ({
  handleExceptions: true,
  exitOnError: false,
  format: winston.format.combine(
    winston.format.label({ label }),
    serverName({ serverName: HOST_NICKNAME })
  ),
  transports: (
    _DEV_
      ? [
          consoleTransport,
          ...allFileTransports
        ]
      : [
          logzioWinstonTransport,
          ...allFileTransports
        ]
  )
})

// A logger specifically for express (use as express middleware)
const expressLogger = ExpressWinston.logger({
  ...makeConfig('PARSEC-server:express'),
  meta: false,
  msg: 'HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}'
})

export function makeLogger (systemName, subsystemName) {
  // Were strings provided for the parameters?
  if (typeof systemName !== 'string' || typeof subsystemName !== 'string') {
    throw new Error('Must provide strings for system name and subsystem name to makeLogger')
  }

  // Are the strings non-empty?
  if (systemName === '' || subsystemName === '') {
    throw new Error('System name and subsystem name cannot be empty')
  }

  // Is this the express logger?
  if (systemName === 'server' && subsystemName === 'express') {
    return expressLogger
  }

  // Unique logger ID
  const loggerID = `PARSEC-${systemName}:${subsystemName}`

  // If it already exists, return it
  if (winston.loggers.has(loggerID)) {
    return winston.loggers.get(loggerID)
  }

  // Make a normal logger
  winston.loggers.add(loggerID, makeConfig(loggerID))
  return winston.loggers.get(loggerID)
}
