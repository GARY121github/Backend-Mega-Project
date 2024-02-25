import { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/Cloudinary.js';


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    if (!name.trim() || !description.trim()) {
        throw new ApiError(400, "Name and description are required")
    }

    const playlistThumbnailURL = await uploadOnCloudinary(thumbnailLocalPath);

    if (!playlistThumbnailURL) {
        throw new ApiError(500, "Failed to upload thumbnail of playlist to cloudinary");
    }

    await Playlist.create({
        name,
        description,
        owner: req.user._id,
        thumbnail: playlistThumbnailURL.url
    })

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "New Playlist created successfully"
        ));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id while fetching th user's playlists")
    }

    const playlists = await Playlist.find({ owner: userId });

    if (!playlists) {
        throw new ApiError(404, "User's playlists not found")
    }

    return res.
        status(200).
        json(new ApiResponse(
            200,
            playlists,
            "User's playlists fetched successfully"
        ))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const playlist = await Playlist.findById(playlistId).populate("videos");
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res.
        status(200).
        json(new ApiResponse(
            200,
            playlist,
            "Playlist fetched successfully"
        ));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found while adding video to playlist");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found while adding video to playlist");
    }

    const play = await Playlist.findByIdAndUpdate(playlistId, {
        $addToSet: {
            videos: videoId
        }
    });

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Video added to playlist successfully"
        ));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or video id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to remove video from this playlist")
    }

    if (!playlist) {
        throw new ApiError(404, "Playlist not found while removing video from playlist");
    }

    if (!playlist.videos.includes(videoId)) {
        throw new ApiError(404, "Video not found in playlist");
    }

    await Playlist.findByIdAndUpdate(playlistId, {
        $pull: {
            videos: videoId
        }
    });

    return res.
        status(200).
        json(new ApiResponse(
            200,
            {},
            "Video removed from playlist successfully"
        ))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist")
    }

    const playlistThumbnailPublicId = playlist.thumbnail;

    await Playlist.findByIdAndDelete(playlistId);
    await deleteFromCloudinary(playlistThumbnailPublicId);

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Playlist deleted successfully"
        ));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist")
    }

    await Playlist.findByIdAndUpdate(playlistId, {
        name,
        description
    });

    return res.
        status(201).
        json(new ApiResponse(
            201,
            {},
            "Playlist updated successfully"
        ));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}