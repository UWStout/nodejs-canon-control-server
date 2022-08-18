import fs from 'fs'
import { parentPort } from 'worker_threads'
import { getImageInfoFromFile } from '../util/fileHelper.js'

// listen for new tasks
parentPort.on('message', async (workerData) => {
  // Verify task data
  const { filePath, imgData } = workerData
  if (typeof imgData !== 'string' || typeof filePath !== 'string') {
    throw new Error(`Invalid parameters imgData: ${imgData}, filePath: ${filePath}`)
  }

  // Download image to file
  const imgBuffer = Buffer.from(imgData, 'base64')
  fs.writeFileSync(filePath, imgBuffer, { encoding: 'utf8' })

  // Retrieve Exposure info from file
  const exposureInfo = await getImageInfoFromFile(filePath)

  // Report success
  parentPort.postMessage({ success: true, exposureInfo})
})
