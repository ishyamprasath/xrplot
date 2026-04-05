import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer, folder = 'xrplot') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto',
        format: 'jpg',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    
    uploadStream.end(buffer);
  });
}

export async function uploadImageFromUrl(imageUrl, folder = 'xrplot') {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder,
    resource_type: 'image',
    quality: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
  }
}

export async function deleteFolder(folderPath) {
  try {
    await cloudinary.api.delete_resources_by_prefix(folderPath);
    await cloudinary.api.delete_folder(folderPath);
  } catch (error) {
    console.error('Failed to delete folder from Cloudinary:', error);
  }
}

export { cloudinary };
