/**
 * JS bridge to the Android foreground TrainingService + screen wake lock.
 * No-op on web/iOS.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const TrainingNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  ? registerPlugin('TrainingService')
  : null;

let _wakeLock = null;

async function acquireScreenLock() {
  try {
    if ('wakeLock' in navigator && !_wakeLock) {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener?.('release', () => { _wakeLock = null; });
    }
  } catch {}
}
function releaseScreenLock() {
  try {
    if (_wakeLock) { _wakeLock.release(); _wakeLock = null; }
  } catch {}
}

export async function startTrainingForeground() {
  await acquireScreenLock();
  if (TrainingNative) {
    try { await TrainingNative.start(); } catch {}
  }
}
export async function stopTrainingForeground() {
  releaseScreenLock();
  if (TrainingNative) {
    try { await TrainingNative.stop(); } catch {}
  }
}
