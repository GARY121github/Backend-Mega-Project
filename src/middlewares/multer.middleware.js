import multer from 'multer';

// Configure multer disk storage
const storage = multer.diskStorage({
    // Set the destination directory for uploaded files
    destination: function (req, file, cb) {
        cb(null, './public/temp'); // Specify the destination directory (change as needed)
    },
    
    // Define the filename for uploaded files
    filename: function (req, file, cb) {
        // Generate a unique filename using the original filename and a timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.originalname + '-' + uniqueSuffix); // Specify the filename format
    }
});

// Create a multer instance with the configured storage
export const upload = multer({ storage: storage });

// The 'upload' instance can be used as middleware in your Express routes
