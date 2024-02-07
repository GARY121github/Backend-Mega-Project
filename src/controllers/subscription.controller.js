import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if (!subscription) {
        await Subscription.create({
            subscriber: req.user._id,
            channel: channelId
        });
    }
    else {
        await Subscription.findByIdAndDelete(subscription._id);
    }

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Subscription updated successfully"
        ));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber"
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    avatar: 1
                }
            }
        }
    ]);

    console.log(subscribers);

    return res.
        status(201).
        json(new ApiResponse(
            201,
            subscribers = subscribers[0],
            "Subscribers fetched successfully"
        ));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid subscriber id");
    }

    const user = await User.findById(channelId);
    if (!user) {
        throw new ApiError(404, "User not found while fetching subscribed channels");
    }

    const subscribedChannels = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "subscribedChannel"
                }
            },
            {
                $unwind: "$subscribedChannel"
            },
            {
                $project: {
                    _id: 0,
                    subscriber: 0,
                    channel: 0,
                    updatedAt: 0,
                    __v: 0,
                    createdAt: 0,
                    subscribedChannel: {
                        __v: 0,
                        refreshToken: 0,
                        password: 0,
                        watchHistory: 0,
                        createdAt: 0,
                        updatedAt: 0
                    }
                }
            }
        ]);

    return res.
        status(201).
        json(new ApiResponse(
            201,
            subscribedChannels,
            "Subscribed channels fetched successfully"
        ));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}