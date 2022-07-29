// The mjpeg url.
const url = '/mjpeg'

const SOI = new Uint8Array(2)
SOI[0] = 0xFF
SOI[1] = 0xD8
const CONTENT_LENGTH = 'content-length'
const TYPE_JPEG = 'image/jpeg'
const image = document.getElementById('image')

fetch(url).then(response => {
  if (!response.ok) {
    throw Error(response.status + ' ' + response.statusText)
  }

  if (!response.body) {
    throw Error('ReadableStream not yet supported in this browser.')
  }

  const reader = response.body.getReader()

  let headers = ''
  let contentLength = -1
  let imageBuffer = null
  let bytesRead = 0

  // calculating fps. This is pretty lame. Should probably implement a floating window function.
  let frames = 0
  setInterval(() => {
    console.log('fps : ' + frames)
    frames = 0
  }, 1000)

  const read = () => {
    reader.read().then(({ done, value }) => {
      if (done) {
        controller.close()
        return
      }

      for (let index = 0; index < value.length; index++) {
        // we've found start of the frame. Everything we've read till now is the header.
        if (value[index] === SOI[0] && value[index + 1] === SOI[1]) {
          // console.log('header found : ' + newHeader);
          contentLength = getLength(headers)
          // console.log("Content Length : " + newContentLength);
          imageBuffer = new Uint8Array(new ArrayBuffer(contentLength))
        }
        // we're still reading the header.
        if (contentLength <= 0) {
          headers += String.fromCharCode(value[index])
        } else if (bytesRead < contentLength) {
          // we're now reading the jpeg.
          imageBuffer[bytesRead++] = value[index]
        } else {
          // we're done reading the jpeg. Time to render it.
          // console.log("jpeg read with bytes : " + bytesRead);
          const frame = URL.createObjectURL(new Blob([imageBuffer], {
            type: TYPE_JPEG
          }))
          image.src = frame
          URL.revokeObjectURL(frame)
          frames++
          contentLength = 0
          bytesRead = 0
          headers = ''
        }
      }

      read()
    }).catch(error => {
      console.error(error)
    })
  }

  read()
}).catch(error => {
  console.error(error)
})

const getLength = (headers) => {
  let contentLength = -1
  headers.split('\n').forEach((header, _) => {
    const pair = header.split(':')
    // Fix for issue https://github.com/aruntj/mjpeg-readable-stream/issues/3 suggested by martapanc
    if (pair[0].toLowerCase() === CONTENT_LENGTH) {
      contentLength = pair[1]
    }
  })
  return contentLength
}
