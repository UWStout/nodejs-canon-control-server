import fs from 'fs'
import { parentPort } from 'worker_threads'

// listen for new tasks
parentPort.on('message', async (workerData) => {
  // Verify task data
  const { filePath, imgBuffer } = workerData
  if (typeof imgBuffer !== 'object' || typeof filePath !== 'string') {
    throw new Error(`Invalid parameters imgBuffer: ${typeof imgBuffer}, filePath: ${typeof filePath}`)
  }

  // Download image to file
  fs.writeFileSync(filePath, imgBuffer, { encoding: 'utf8' })

  // Report success
  parentPort.postMessage({ success: true, filePath })
})
