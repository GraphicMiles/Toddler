/**
 * Native bridge — starts/stops the Android foreground service
 * so training keeps running with the screen off.
 */
import { Capacitor, registerPlugin } from '@capacitor/core'

let _plugin = null
let _checked = false

function getPlugin() {
  if (_checked) return _plugin
  _checked = true
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      _plugin = registerPlugin('TrainingPlugin')
    }
  } catch { _plugin = null }
  return _plugin
}

export async function startTrainingService(jobId, datasetUrl) {
  const p = getPlugin()
  if (!p) return
  try {
    await p.start({ jobId, datasetUrl })
  } catch (e) {
    console.warn('[nativeBridge] start failed:', e.message)
  }
}

export async function stopTrainingService() {
  const p = getPlugin()
  if (!p) return
  try {
    await p.stop()
  } catch (e) {
    console.warn('[nativeBridge] stop failed:', e.message)
  }
}
