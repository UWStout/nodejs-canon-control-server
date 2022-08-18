import path from 'path'
import WorkerWrapper from './WorkerWrapper.js'

// Hardcoded path to script (relative to working directory)
const IMG_DOWNLOAD_SCRIPT_PATH = path.join(process.cwd(), 'server', 'threading', 'imageDownloadWorker.js')

const taskQueue = []
const workerPool = []
const POOL_SIZE = 16
let finished = 0
let requested = 0
for (let i = 0; i < POOL_SIZE; ++i) { workerPool.push(new WorkerWrapper(IMG_DOWNLOAD_SCRIPT_PATH, rePoolWorker)) }

function rePoolWorker(worker) {
  console.log(`Downloading: ${finished}/${requested} | PoolAvailable: ${workerPool.length}/${POOL_SIZE}`)
  workerPool.push(worker)
  doNextTask()
}

function doNextTask() {
  const nextTask = taskQueue.pop()
  if (nextTask !== undefined)
  {
    const nextWorker = workerPool.pop()
    if (nextWorker !== undefined) {
      nextWorker.runWorker(nextTask)
      finished++
    } else {
      taskQueue.push(nextTask)
    }
  }
}

export async function downloadImgThreaded (imgData, filePath, imgInfoCallback) {
    taskQueue.push({workerData: {imgData, filePath}, imgInfoCallback})
    requested++
    doNextTask()
}