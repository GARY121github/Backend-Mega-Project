import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    const { content } = req.body;

    if (!content.trim()) {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    });

    return res.status(201).json(new ApiResponse(
        201,
        {},
        "Tweet added!!"
    ));

})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // TODO: get user tweets
    const allTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
            }
        }
    ]);

    console.log(allTweets);

    return res.status(200).json(new ApiResponse(
        200,
        allTweets,
        "Tweets fetched successfully"
    ));
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    const tweet = await Tweets.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to perform this action");
    }

    if (!content.trim()) {
        throw new ApiError(400, "Content is required");
    }

    tweet.content = content;
    await tweet.save();

    return res.status(200).json(new ApiResponse(
        200,
        {},
        "Tweet updated successfully"
    ));

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to perform this action");
    }

    await tweet.remove();

    return res.status(200).json(new ApiResponse(
        200,
        {},
        "Tweet deleted successfully"
    ));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}