import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id while toggling like on video")
    }

    const toggleLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    if (!toggleLike) {
        await Like.create({
            video: videoId,
            likedBy: req.user._id
        });
    }
    else {
        await Like.findByIdAndDelete(toggleLike._id);
    }

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Video Liked toggled successfully"
        ))
    //TODO: toggle like on video
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid video id while toggling like on comment")
    }

    const toggleLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if (!toggleLike) {
        await Like.create({
            comment: commentId,
            likedBy: req.user._id
        });
    }
    else {
        await Like.findByIdAndDelete(toggleLike._id);
    }

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Video Liked toggled successfully"
        ))

    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid video id while toggling like on tweet")
    }

    const toggleLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if (!toggleLike) {
        await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        });
    }
    else {
        await Like.findByIdAndDelete(toggleLike._id);
    }

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Video Liked toggled successfully"
        ))
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "LikedVideos"
            }
        },
        {

            $unwind: "$LikedVideos"

        }
    ])

    return res.
        status(200).
        json(new ApiResponse(
            200,
            LikedVideos = likedVideos[0],
            "Liked Videos Fetched Successfully"
        ))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}