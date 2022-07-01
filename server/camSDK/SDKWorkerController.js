import path from 'path'
import { Worker } from 'worker_threads'

// Hardcoded path to script (relative to working directory)
const WORKER_SCRIPT_PATH = path.join(process.cwd(), 'server', 'camSDK', 'pressShutterWorker.js')
export default function EDSDKRunner (data) {
  return new Promise((resolve, reject) => {
    // Create worker thread
    const cameraWorker = new Worker(WORKER_SCRIPT_PATH, { workerData: data })

    // Listen for messages and resolve/reject accordingly
    cameraWorker.on('message', resolve)
    cameraWorker.on('error', reject)
    cameraWorker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`stopped with ${code} exit code`))
      }
    })
  })
}
