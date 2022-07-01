import camSDK from '@dimensional/napi-canon-cameras'
import EDSDKRunner from './server/camSDK/SDKWorkerController.js'

const run = async () => {
  try {
    const result = await Promise.all(
      [0, 23].map(index =>
        EDSDKRunner({ index, pressType: camSDK.Camera.PressShutterButton.Halfway })
      )
    )
    console.log(result)
  } catch (error) {
    console.error(error)
  }
}

run().catch(err => console.error(err))
