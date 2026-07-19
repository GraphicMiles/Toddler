/**
 * Local notifications for training-complete events.
 *
 * Uses @capacitor/local-notifications so we don't need a server, FCM, or
 * VAPID keys. Works 100% offline — fires immediately when the app detects a
 * project has finished training. For true push (FCM) when the app is killed,
 * add @capacitor/push-notifications + a server-side sender later.
 */
import { LocalNotifications } from '@capacitor/local-notifications';

let notified = new Set(); // jobId/projectId already notified this session
let permissionChecked = false;

export async function ensureNotifyPermission() {
  if (permissionChecked) return true;
  try {
    // Android 13+ requires POST_NOTIFICATIONS (declared in manifest); iOS always prompts.
    const perm = await LocalNotifications.requestPermissions();
    permissionChecked = true;
    return perm.display === 'granted';
  } catch {
    permissionChecked = true;
    return false;
  }
}

/**
 * Fire a "training complete" notification. Safe to call repeatedly with the
 * same id — we dedupe in-memory per session.
 *
 * @param {{id:string, title:string, body:string}} opts
 */
export async function notifyTrainingComplete({ id, title, body }) {
  const key = `trained:${id}`;
  if (notified.has(key)) return;
  notified.add(key);
  try {
    const ok = await ensureNotifyPermission();
    if (!ok) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.abs(hashCode(key)) % 2147483647,
        title: title || 'Toddler',
        body: body || 'Your model finished training.',
        // Small icon: Android falls back to app icon; the lime hollow square
        // would need to be registered as a drawable resource to use here.
        schedule: { at: new Date(Date.now() + 250) },
        sound: 'beep.wav',
        actionTypeId: '',
        extra: { type: 'training-complete', projectId: id },
      }],
    });
  } catch (e) {
    console.warn('notify failed', e);
  }
}

/** Clear the dedupe set (e.g. after logout). */
export function resetNotificationMemory() { notified = new Set(); }

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i) | 0; }
  return h;
}
