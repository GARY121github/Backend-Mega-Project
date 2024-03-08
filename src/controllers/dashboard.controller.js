import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $count: 'totalSubscribers'
        }
    ]);

    const totalVideosViews = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: '$views' }
            }
        }
    ]);

    const totalLikes = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: 1 } // Count the documents
            }
        }
    ]);

    const stats = {
        totalSubscribers: totalSubscribers[0]?.totalSubscribers || 0,
        totalVideosViews: totalVideosViews[0]?.totalViews || 0,
        totalLikes: totalLikes[0]?.totalLikes || 0,
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { stats },
            "Channel stats retrieved successfully"
        ));

})

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes'
            }
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                views: 1,
                likes: { $size: '$likes' },
                createdAt: 1,
                updatedAt: 1,
                isPublished: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { videos: videoStats },
            "Channel videos retrieved successfully"
        ));
})

export {
    getChannelStats,
    getChannelVideos
}