import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Could not find video for fetching comment");
    }

    const aggregateOptions = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $sort: { createdAt: -1 }, // Sort by createdAt in descending order (newest first)
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: parseInt(limit),
        },
        {
            $lookup: {
                from: "users", // Assuming the User collection name is 'users'
                localField: "owner",
                foreignField: "_id",
                as: "user",
            },
        },
        {
            $unwind: "$user", // Unwind the array created by $lookup
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                user: { _id: 1, username: 1, email: 1 , avatar: 1 }, // Select user fields you want to include
            },
        },
    ];

    const comments = await Comment.aggregate(aggregateOptions);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            comments,
            "Comments fetched successfully"
        ));
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content.trim()) {
        throw new ApiError(400, "Comment is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Could not find video for adding comment");
    }

    await Comment.create(
        {
            content,
            video: video._id,
            owner: req.user._id
        }
    )

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Comment added successfully"
        ));
    // TODO: add a comment to a video
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        return new ApiError(400, "Could not find comment to update");
    }

    if (comment.owner.toString() !== commentId.toString()) {
        new ApiError(400, "You don't have permission to update this comment");
    }

    await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true,
        }
    )

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Comment updated successfully"
        ));
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(402, "comment not found for deleting it");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to perform that");
    }

    await Comment.findByIdAndDelete(commentId);

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Comment deleted successfully"
        ));
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}