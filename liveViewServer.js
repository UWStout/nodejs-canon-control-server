import http from 'http'
import MJPEGServer from 'mjpeg-server'

export function makeMJPEGServer (serverPort) {
  return new Promise((resolve, reject) => {
    http.createServer((req, res) => {
      console.log('Got request')
      const MJPEGReqHandler = MJPEGServer.createReqHandler(req, res)

      const sendJPEGData = (data) => {
        MJPEGReqHandler.write(data)
      }

      const stopServer = () => {
        MJPEGReqHandler.close()
      }

      resolve([sendJPEGData, stopServer])
    }).listen(serverPort)
  })
}
