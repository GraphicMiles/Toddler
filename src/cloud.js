export const uploadToCloudinary = async (jsonString) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset || cloudName === 'your_cloud_name') {
    return null; // Fallback to IndexedDB if not configured
  }

  const blob = new Blob([jsonString], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'model_weights.json');
  formData.append('upload_preset', uploadPreset);
  formData.append('resource_type', 'raw'); // Essential for non-image files like JSON

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error("Cloudinary upload failed. Check your upload preset.");
  const data = await res.json();
  return data.secure_url;
};

export const fetchFromCloudinary = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch model weights from Cloudinary.");
  return await res.text();
};