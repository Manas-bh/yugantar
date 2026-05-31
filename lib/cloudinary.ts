import { v2 as cloudinary } from "cloudinary";
import { logger } from "@/lib/logger";

if (
  !process.env.CLOUDINARY_URL &&
  (!process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET)
) {
  throw new Error(
    "Cloudinary configuration missing. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET"
  );
}

// Configure Cloudinary - it will automatically parse CLOUDINARY_URL if provided
// or use individual components
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const uploadImage = async (
  file: Buffer,
  folder: string = "tshirt-products"
) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "auto",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      )
      .end(file);
  });
};

export const deleteImage = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error("Error deleting image from cloudinary:", error);
    throw error;
  }
};
