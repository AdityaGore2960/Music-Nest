/**
 * Utility function to upload files to Cloudinary
 * Supports audio and image file types
 */
const { cloudinary } = require('../config/cloudinary');

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder to store in
 * @param {string} resourceType - 'image' | 'video' (audio uses 'video' type)
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = (fileBuffer, folder, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `musicnest/${folder}`,
        resource_type: resourceType,
        // For audio: get duration metadata
        ...(resourceType === 'video' && {
          audio_codec: 'mp3',
          flags: 'attachment',
        }),
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration || null, // Available for audio
          });
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${error.message}`);
    throw error;
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
