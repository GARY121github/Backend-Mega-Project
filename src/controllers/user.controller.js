import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/Cloudinary.js';
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

const changeCurrentPassword = asyncHandler((async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
}))

const getCurrentUser = asyncHandler((async (req, res) => {
    return res.
        status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
}));

const updateAccountDetails = asyncHandler((async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All filed are required!!");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
}))

const updateUserAvatar = asyncHandler((async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        return new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        return new ApiError(400, "Error while uploading on avatar");
    }

    const currentAvatar = req.user.avatar;

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        {
            new: true
        }
    )

    await deleteFromCloudinary(currentAvatar);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Avatar updates successfully"));
}))

const updateUserCoverImage = asyncHandler((async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        return new ApiError(400, "coverImage file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        return new ApiError(400, "Error while uploading on coverImage");
    }

    const previousCoverImage = req.user.coverImage;

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        {
            new: true
        }
    )

    if (previousCoverImage) {
        await deleteFromCloudinary(previousCoverImage);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "coverImage updates successfully"));
}))

const getUserChannelProfile = asyncHandler((async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriberTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscriberToCount: {
                    $size: "$subscriberTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                subscribersCount: 1,
                channelsSubscriberToCount: 1,
                isSubscribed: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ]);

    console.log(channel);
    if (!channel?.length) {
        throw new ApiError(404, "Channel not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channel[0],
            "Channel fetched successfully"
        ));
}));

const getWatchHistory = asyncHandler((async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        ));

}))

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
