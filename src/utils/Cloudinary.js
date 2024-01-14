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
        return uploadedResponse;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    } finally {
        fs.unlinkSync(localFilePath); // Remove the locally saved temporary file
    }
};

const deleteFromCloudinary = async (url) => {
    try {
        console.log("DELETE FROM CLOUDINARY FILE :: " , url);
        if (!url) {
            throw new Error("Public url of the file is required to delete");
        }
        
        const publicId = `${FOLDER_NAME}/${url.split('/').pop().split('.')[0]}`;
        const deletedFile = await cloudinary.uploader.destroy(publicId);
    }
    catch (error) {
        console.log("Error while deleting file from cloudinary :: ", error);
    }
}

export {
    uploadOnCloudinary,
    deleteFromCloudinary
}
