import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoLikes = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id while fetching likes on video")
    }

    const result = await Like.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: 1 },
                isLikedByUser: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$likedBy", userId] },
                            then: 1,
                            else: 0
                        }
                    }
                }
            }
        }
    ]);

    let likesInfo;
    if (result.length === 0) {
        // If no likes found, set totalLikes to 0 and isLikedByUser to false
        likesInfo = {
            totalLikes: 0,
            isLikedByUser: false
        };
    } else {
        likesInfo = {
            totalLikes: result[0].totalLikes,
            isLikedByUser: result[0].isLikedByUser === 1
        }
    }

    return res.status(200).json(new ApiResponse(
        200,
        likesInfo,
        "Likes on video fetched successfully"
    ));
});



const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id while toggling like on video");
    }

    const toggleLike = await Like.findOneAndDelete({
        video: videoId,
        likedBy: userId
    });

    if (!toggleLike) {
        await Like.create({
            video: videoId,
            likedBy: userId
        });
    }

    return res.status(200).json(new ApiResponse(
        200,
        {},
        "Video like toggled successfully"
    ));
});


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
                as: "likedVideos"
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $lookup: {
                from: "users", // Assuming the collection name is "users"
                localField: "likedVideos.owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                "owner.refreshToken": 0,
                "owner.password": 0,
                "owner.email": 0,
                "owner.__v": 0,
                "owner.createdAt": 0,
                "owner.updatedAt": 0,
                "owner.watchHistory": 0,
                "owner.coverImage": 0,
            }
        },
        {
            $replaceRoot: { newRoot: { $mergeObjects: ["$likedVideos", { owner: "$owner" }] } }
        }
    ]);

    return res.
        status(200).
        json(new ApiResponse(
            200,
            likedVideos,
            "Liked Videos Fetched Successfully"
        ))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getVideoLikes
}