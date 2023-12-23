import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import uploadOnCloudinary from '../utils/Cloudinary.js';
import jwt from 'jsonwebtoken';

const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Error generating tokens");
    }
}

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
        username: username.toLowerCase(),
        email,
        fullName: fullName.toLowerCase(),
        password,
        avatar: avatarUrl.url,
        coverImage: coverImageUrl?.url
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

// Login endpoint for authenticating and generating tokens for a user
const loginUser = asyncHandler(async (req, res) => {
    // Destructuring relevant information from the request body
    const { username, email, password } = req.body;
    console.log(req.body);

    // Checking if either username or email is provided, as one of them is required
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Finding a user based on the provided username or email
    const user = await User.findOne({
        $or: [
            { username: username.toLowerCase() },
            { email }
        ]
    });

    // If no user is found, throwing an error indicating that the user does not exist
    if (!user) {
        throw new ApiError(400, "User does not exist");
    }

    // Verifying if the provided password matches the user's stored password
    const isPasswordCorrect = await user.isPasswordCorrect(password);

    // If the password is incorrect, throwing an error for invalid credentials
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid credentials");
    }

    // Generating access and refresh tokens for the authenticated user
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Fetching the authenticated user excluding sensitive information
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Configuration options for the HTTP-only and secured cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    // Responding with success status, setting cookies, and returning user details and tokens
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
                , "User logged in successfully")
        );
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.headers("Authorization")?.split(" ")[1] || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token has expired or is used");
        }

        const { accessToken, refreshToken } = await generateTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200,
                    {
                        accessToken,
                        refreshToken
                    }
                    , "Access token refreshed successfully")
            );
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
