import { Worker } from 'worker_threads'

export default class WorkerWrapper {
  // Create a new worker and initialize callbacks
  constructor (workerScript, rePoolCallback) {
    this.worker = new Worker(workerScript)
    this.rePoolCallback = rePoolCallback
    this.imgInfoCallback = null

    // If success message received, return data via callback, then rejoin worker pool
    this.worker.on('message', (data) => {
      if (data.success === true) {
        this.completeCallback(data)
        this.completeCallback = null
        this.rePoolCallback(this)
      }
    })

    // Handle Error & Exit
    this.worker.on('error', (err) => {
      console.error(err)
    })
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(new Error(`stopped with ${code} exit code`))
      }
    })
  }

  // Give a task to worker
  runWorker (task) {
    this.completeCallback = task.completeCallback
    if (task.workerData.imgBuffer) {
      this.worker.postMessage(task.workerData, [task.workerData.imgBuffer.buffer])
    } else {
      this.worker.postMessage(task.workerData)
    }
  }
}
