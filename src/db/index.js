import mongoose, { model } from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MOGODB_URI}/${DB_NAME}`);
        console.log(`connected to database!! :: host id -> ${connectionInstance.connection.host}`);
    }
    catch (err) {
        console.error("Error in connecting :: " + err);
        process.exit(1);
    }
}

export default connectDB;