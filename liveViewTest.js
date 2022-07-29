import camAPI from '@dimensional/napi-canon-cameras'
import { EventEmitter } from 'events'
import { makeMJPEGServer } from './liveViewServer'

const [sendJPEG, stopServer] = await makeMJPEGServer(42424)

const events = new EventEmitter()
events.on(
  camAPI.CameraBrowser.EventName.PropertyChangeValue,
  (event) => {
    if (event.property.identifier === camAPI.CameraProperty.ID.Evf_OutputDevice) {
      console.log(event.property.label, event.property.value)
    }
  }
)

events.on(
  camAPI.CameraBrowser.EventName.LiveViewStart,
  (event) => {
    console.log('LV Started', event)
  }
)

events.on(
  camAPI.CameraBrowser.EventName.LiveViewStop,
  (event) => {
    console.log('LV Stopped', event)
  }
)

camAPI.cameraBrowser.setEventHandler(
  (eventName, ...args) => {
    // console.log('Emitted:', ...args);
    events.emit(eventName, ...args)
  }
)

try {
  const camera = camAPI.cameraBrowser.getCamera()
  if (camera) {
    console.log(camera)
    camera.connect()
    console.log()

    process.on('SIGINT', () => {
      camera.stopLiveView()
      stopServer()
      process.exit()
    })
  }

  if (camera.getProperty(camAPI.CameraProperty.ID.Evf_Mode).available) {
    camera.startLiveView()
    setInterval(
      () => {
        try {
          const imageData = camera.downloadLiveViewImage()
          sendJPEG(imageData)
        } catch (e) {
          if (!e.message.includes('EDSDK - OBJECT_NOTREADY')) {
            console.log(e)
          }
        }
      },
      5 // Approx 24fps
    )
  }

  camAPI.watchCameras()
} catch (e) {
  console.log(e)
}
