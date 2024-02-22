import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    //TODO: get all videos based on query, sort, pagination
})

const getUsersAllVideo = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne(
        {
            username: username
        }
    );

    if (!user) {
        throw new ApiError("400", "Invalid user");
    }

    const videos = await Video.find({
        owner: user._id,
        isPublished: true
    }).populate("owner", "username fullName avatar _id");

    console.log(videos);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            videos,
            "User's videos has been fetched successfully"
        ))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoFilePath = req.files?.videoFile?.[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail?.[0]?.path;

    if (!videoFilePath) {
        throw new ApiError(404, "Video file is required");
    }

    if (!thumbnailFilePath) {
        throw new ApiError(404, "Thumbnail file is required");
    }

    const video = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);

    await Video.create(
        {
            title,
            description,
            videoFile: video.url,
            thumbnail: thumbnail.url,
            owner: req.user._id,
            duration: video.duration
        }
    )

    return res.status(201).json(new ApiResponse(
        201,
        {},
        "Video has been published successfully"
    ));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId)?.populate("owner", "username email");

    if (!video) {
        throw new ApiError(401, "Video not found");
    }

    return res.status(200).json(new ApiResponse(
        200,
        video,
        "Video has been fetched successfully"
    ));
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailFilePath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Invalid video");
    }

    const previousThumbnail = video.thumbnail;

    const newThumbnail = await uploadOnCloudinary(thumbnailFilePath);

    await deleteFromCloudinary(previousThumbnail);

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: newThumbnail.url
            }
        },
        {
            new: true
        }
    );

    return res.status(200).json(new ApiResponse(
        200,
        updatedVideo,
        "Video has been updated successfully"
    ));
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Invalid video to delete");
    }

    const cloudinaryVideoUrl = video.videoFile;
    const cloudinaryThumbnailUrl = video.thumbnail;

    await deleteFromCloudinary(cloudinaryVideoUrl);
    await deleteFromCloudinary(cloudinaryThumbnailUrl);

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(
        200,
        {},
        "Video has been deleted successfully"
    ));
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Invalid video to publish");
    }

    const toggledVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true,
        }
    )

    return res.status(200).json(new ApiResponse(
        201,
        toggledVideo,
        "Video has been toggled successfully"
    ))
})

const increaseVideoViews = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);

    // Check if video exists
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if the video is owned by the user
    if (video.owner.toString() === req.user._id.toString()) {
        // If the video is owned by the user, return without incrementing views
        return res.status(200).json(new ApiResponse(
            200,
            {},
            "Video views were not incremented because it is owned by the user"
        ));
    }

    // Increment views if the video is not owned by the user
    video.views += 1;
    await video.save();

    return res.status(200).json(new ApiResponse(
        200,
        {},
        "Video views has been increased successfully"
    ))
});

const getRecommendedVideos = asyncHandler(async (req, res) => {
    const videos = await Video.find({ isPublished: true })
        .sort({ views: -1 })
        .limit(5);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            videos,
            "Recommended videos has been fetched successfully"
        ))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    increaseVideoViews,
    getRecommendedVideos,
    getUsersAllVideo
}