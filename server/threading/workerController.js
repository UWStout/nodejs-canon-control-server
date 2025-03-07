import path from 'path'
import WorkerWrapper from './WorkerWrapper.js'

import dotenv from 'dotenv'
dotenv.config()

// Hardcoded path to script (relative to working directory)
const IMG_DOWNLOAD_SCRIPT_PATH = path.join(process.cwd(), 'server', 'threading', 'imageDownloadWorker.js')

// Initialize Worker Pool
const THREAD_POOL_SIZE = process.env.THREAD_POOL_SIZE || 4
const workerPool = []
for (let i = 0; i < THREAD_POOL_SIZE; ++i) {
  workerPool.push(new WorkerWrapper(IMG_DOWNLOAD_SCRIPT_PATH, rePoolWorker))
}

const taskQueue = []

// Add Worker back to pool and check for new tasks
function rePoolWorker (worker) {
  workerPool.push(worker)
  doNextTask()
}

// Pop next task, If a worker is available, assign the task, otherwise reQueue the task
function doNextTask () {
  const nextTask = taskQueue.pop()
  if (nextTask !== undefined) {
    const nextWorker = workerPool.pop()
    if (nextWorker !== undefined) {
      nextWorker.runWorker(nextTask)
    } else {
      taskQueue.push(nextTask)
    }
  }
}

// Add new task to queue and check for available workers
export async function downloadImgThreaded (imgBuffer, filePath, completeCallback) {
  taskQueue.push({ workerData: { imgBuffer, filePath }, completeCallback })
  doNextTask()
}
