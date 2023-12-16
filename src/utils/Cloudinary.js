import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { FOLDER_NAME } from '../constant.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error('Local file path is required');
        }

        // Upload file on Cloudinary
        const uploadedResponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: FOLDER_NAME,
        });

        // File has been uploaded successfully
        console.log("File is uploaded on Cloudinary ", uploadedResponse.url);
        return uploadedResponse;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    } finally {
        fs.unlinkSync(localFilePath); // Remove the locally saved temporary file
    }
};

export default uploadOnCloudinary;
