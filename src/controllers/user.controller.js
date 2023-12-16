import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import uploadOnCloudinary from '../utils/Cloudinary.js';

// Registration endpoint for creating a new user
const registerUser = asyncHandler(async (req, res) => {
    // Destructuring relevant information from the request body
    const { username, email, fullName, password } = req.body;

    // Checking if any required field is empty and throwing an error if so
    if (
        [username, email, fullName, password].some((field) => field.trim() === '')
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Checking if a user with the given username or email already exists
    const existedUser = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (existedUser) {
        throw new ApiError(400, "User already exists");
    }

    // Retrieving avatar and cover image from the request files
    const avatar = req.files?.avatar?.[0]?.path;
    const coverImage = req.files?.coverImage?.[0]?.path;

    // Checking if the avatar is present, as it is required
    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    // Uploading avatar and cover image to Cloudinary and obtaining their URLs
    const avatarUrl = await uploadOnCloudinary(avatar);
    const coverImageUrl = coverImage ? await uploadOnCloudinary(coverImage) : null;
    // Checking for errors during the avatar upload and throwing an error if needed
    if (!avatarUrl) {
        throw new ApiError(500, "Error uploading avatar");
    }

    // Creating a new user with the provided information
    const newUser = await User.create({
        username : username.toLowerCase(),
        email,
        fullName: fullName.toLowerCase(),
        password,
        avatar : avatarUrl.url,
        coverImage : coverImageUrl?.url
    });

    // Fetching the created user excluding sensitive information
    const user = await User.findById(newUser._id).select("-password -refreshToken");

    // Checking if the user was successfully created and throwing an error if not
    if (!user) {
        throw new ApiError(500, "Error creating user");
    }

    // Responding with a success status and the created user details
    return res.status(201).json(
        new ApiResponse(201, user, "User created successfully")
    );
})

// Exporting the registerUser function for use in other parts of the application
export {
    registerUser,
}
