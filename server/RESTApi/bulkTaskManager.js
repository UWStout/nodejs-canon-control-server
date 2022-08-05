import { getMySocket } from '../sockets.js'

import dotenv from 'dotenv'

// Setup logging
import { makeLogger } from '../util/logging.js'
const log = makeLogger('server', 'BulkTask')

dotenv.config()
const HOST_NICKNAME = process.env.HOST_NICKNAME || 'noname'

// Quick creation of unique task IDs
let TASK_SEQUENCE = 0
function createTaskId () {
  TASK_SEQUENCE++
  return `${HOST_NICKNAME}-${Date.now()}-${TASK_SEQUENCE}`
}

// Summarize a set of results from a Promise.allSettled call
function summarizeResults (results) {
  return results.reduce((prev, result, i) => {
    if (result.status === 'fulfilled') {
      // Check for partial error
      if (result.value?.error) {
        return {
          succeeded: prev.succeeded,
          failed: prev.failed + 1,
          messages: [...prev.messages, `Camera ${i} on server ${HOST_NICKNAME}: ${result.value.message}`]
        }
      }

      // Indicate full success
      return {
        succeeded: prev.succeeded + 1,
        failed: prev.failed,
        messages: prev.messages
      }
    } else {
      // Indicate rejection reason
      return {
        succeeded: prev.succeeded,
        failed: prev.failed + 1,
        messages: [...prev.messages, `Camera ${i} on server ${HOST_NICKNAME}: ${result.reason.toString()}`]
      }
    }
  }, { succeeded: 0, failed: 0, messages: [] })
}

export function createBulkTask (taskPromise, type) {
  const taskId = createTaskId()
  getMySocket()?.emit('BulkTaskStarted', { taskId, type })
  taskPromise.then((results) => {
    const summary = summarizeResults(results)
    if (summary.succeeded === 0) {
      log.error(`Bulk task ${taskId} failed`)
      getMySocket()?.emit('BulkTaskFailed', { taskId, type, serverNickname: HOST_NICKNAME, summary })
    } else {
      log.info(`Bulk task ${taskId} complete`)
      getMySocket()?.emit('BulkTaskSucceeded', { taskId, type, serverNickname: HOST_NICKNAME, summary })
    }
  })

  return taskId
}
