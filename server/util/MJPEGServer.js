import fs from 'fs'

export default class MJPEGReqHandler {
  constructor (res) {
    this.res = res

    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=MjPeGsTrEaM',
      'Cache-Control': 'no-cache',
      Connection: 'close',
      Pragma: 'no-cache'
    })
    this.sendBoundary()
  }

  sendBoundary () {
    this.res.write('--MjPeGsTrEaM\r\nContent-Type: image/jpeg\r\n\r\n')
  }

  writeFile (path, cb) {
    if (this.busy) { return }
    try {
      this.busy = true
      const s = fs.createReadStream(path)
      s.pipe(this.res, { end: false })
      // TODO verify that this also gets called on errors
      s.on('end', () => {
        this.busy = false
        this.sendBoundary()
      })
    } catch (err) {
      cb && cb(err)
    }
  }

  writeBuffer (imageBuffer, cb) {
    if (this.busy) { return }
    try {
      this.busy = true
      this.res.write(imageBuffer)
      this.busy = false
      this.sendBoundary()
    } catch (err) {
      cb && cb(err)
    }
  }

  close () {
    this.res.end()
    delete this.res
  }
}
