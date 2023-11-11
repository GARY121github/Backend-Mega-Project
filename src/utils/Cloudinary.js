import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { FOLDER_NAME } from '../constant.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createFolder = async () => {
    try {
        const result = await cloudinary.api.create_folder(FOLDER_NAME);
        console.log(result);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error('Local file path is required');
        }

        // Upload file on Cloudinary
        const uploadedResponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // File has been uploaded successfully
        console.log("File is uploaded on Cloudinary ", uploadedResponse.url);
        return uploadedResponse;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation failed
        throw error;
    }
};

export { createFolder, uploadOnCloudinary };
