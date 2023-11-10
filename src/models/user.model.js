import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            unique: true,
            required: [true, "Username is required"],
            lowercase: true,
            trim: true,
            index: true

        },
        email: {
            type: String,
            unique: true,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            index: true,
            lowercase: true
        },
        avatar: {
            type: String, // cloudinary url
            require: true,
        },
        coverImage: {
            type: String, // cloudinary url
            require: true,
        },
        password: {
            type: String,
            require: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Video'
            }
        ]
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullName : this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRE
        },
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullName : this.fullName,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRE
        },
    )
}

export const User = mongoose.model('User', userSchema);