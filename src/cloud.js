import { auth } from './firebase';

export const uploadDatasetToCloudinary = async (file) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://toddler-53xb.onrender.com';
  if (!apiUrl) throw new Error("Backend API URL not set");
  
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Unauthorized");

  // 1. Get signed url payload from backend
  const res = await fetch(`${apiUrl}/uploads/sign`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error("Failed to get signed upload parameters from server");
  const signed = await res.json();

  // 2. Upload directly to Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signed.apiKey);
  formData.append('timestamp', signed.timestamp);
  formData.append('signature', signed.signature);
  formData.append('folder', signed.folder);
  if (signed.uploadPreset) formData.append('upload_preset', signed.uploadPreset);
  
  // Need raw resource_type for CSVs and JSON
  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';

  // Using standard fetch for Cloudinary upload
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json();
    throw new Error(`Cloudinary upload failed: ${errorData.error?.message || uploadRes.statusText}`);
  }

  const data = await uploadRes.json();
  return data.secure_url;
};
