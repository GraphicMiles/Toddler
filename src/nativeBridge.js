/**
 * Keep training alive when the screen is off.
 *
 * 1. Screen Wake Lock API — keeps the screen + CPU awake while training.
 *    Re-acquires automatically on visibility change (Android releases it
 *    when the lock button is pressed, so we relock on resume).
 * 2. Silent Web Audio oscillator — prevents Android from throttling timers
 *    to 1/min when the tab is backgrounded (the presence of an AudioContext
 *    keeps the JS task queue running at full speed on most devices).
 * 3. Native foreground service (TrainingPlugin) — automatically activates
 *    when the APK is built with our Java TrainingService (CI-built release
 *    APKs include this; no Android Studio needed from you).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

let _nativePlugin = null;
let _nativeChecked = false;
let _wakeLock = null;
let _audio = null;

function nativePlugin() {
  if (_nativeChecked) return _nativePlugin;
  _nativeChecked = true;
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      _nativePlugin = registerPlugin('TrainingService');
    }
  } catch {
    _nativePlugin = null;
  }
  return _nativePlugin;
}

function startAudioKeepalive() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || _audio) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.00001; // essentially inaudible
    osc.frequency.value = 1;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    _audio = { ctx, osc };
  } catch {}
}
function stopAudioKeepalive() {
  try {
    if (_audio) { _audio.osc.stop(); _audio.ctx.close(); _audio = null; }
  } catch {}
}

async function lock() {
  try {
    if ('wakeLock' in navigator && !_wakeLock) {
      _wakeLock = await navigator.wakeLock.request('screen');
      const onVis = async () => {
        if (document.visibilityState === 'visible' && (!_wakeLock || _wakeLock.released)) {
          try { _wakeLock = await navigator.wakeLock.request('screen'); } catch {}
        }
      };
      document.addEventListener('visibilitychange', onVis);
      _wakeLock._off = () => document.removeEventListener('visibilitychange', onVis);
    }
  } catch {}
}
function unlock() {
  try {
    if (_wakeLock) {
      if (_wakeLock._off) _wakeLock._off();
      _wakeLock.release?.();
      _wakeLock = null;
    }
  } catch {}
}

export async function startTrainingForeground() {
  await lock();
  startAudioKeepalive();
  const p = nativePlugin();
  if (p) { try { await p.start(); } catch {} }
}
export async function stopTrainingForeground() {
  unlock();
  stopAudioKeepalive();
  const p = nativePlugin();
  if (p) { try { await p.stop(); } catch {} }
}
