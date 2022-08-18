import fs from 'fs'
import { parentPort } from 'worker_threads'
import { getImageInfoFromFile } from '../util/fileHelper.js'

parentPort.on('message', async (workerData) => {
  const { filePath, imgData } = workerData
  if (typeof imgData !== 'string' || typeof filePath !== 'string') {
    throw new Error(`Invalid parameters imgData: ${imgData}, filePath: ${filePath}`)
  }

  const imgBuffer = Buffer.from(imgData, 'base64')
  fs.writeFileSync(filePath, imgBuffer, { encoding: 'utf8' })
  const exposureInfo = await getImageInfoFromFile(filePath)

  // Report success
  parentPort.postMessage({ success: true, exposureInfo})
  
})
