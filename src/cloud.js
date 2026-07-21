import { auth } from './firebase';

export const uploadDatasetToCloudinary = async (file) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com';
  if (!apiUrl) throw new Error("Backend API URL not set");

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");

  // 1. Get signed upload params from backend
  const res = await fetch(`${apiUrl}/uploads/sign`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = `Upload sign failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  const signed = await res.json();

  // 2. Upload directly to Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signed.apiKey);
  formData.append('timestamp', signed.timestamp);
  formData.append('signature', signed.signature);
  formData.append('folder', signed.folder);
  if (signed.uploadPreset) formData.append('upload_preset', signed.uploadPreset);

  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!uploadRes.ok) {
    let msg = `Cloudinary upload failed (${uploadRes.status})`;
    try {
      const err = await uploadRes.json();
      msg = err.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await uploadRes.json();
  return data.secure_url;
};
