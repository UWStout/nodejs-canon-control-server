import { Worker } from 'worker_threads'

export default class WorkerWrapper {
  constructor(workerScript, rePoolCallback) {
    this.worker = new Worker(workerScript)
    this.rePoolCallback = rePoolCallback
    this.imgInfoCallback = null

    this.worker.on('message', (data) => {
      if (data.success === true) {
        this.imgInfoCallback(data.exposureInfo)
        this.imgInfoCallback = null
        this.rePoolCallback(this)
      }
    })
    this.worker.on('error', (err) => {
      console.error(err)
    })
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(new Error(`stopped with ${code} exit code`))
      }
    })
  }

  runWorker(task) {
    this.imgInfoCallback = task.imgInfoCallback
    this.worker.postMessage(task.workerData)
  }
}