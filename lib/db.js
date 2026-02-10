import mongoose from "mongoose";

// Function to connect to the monmgodb database 

export const connectDB = async ()=> {
    try {
        mongoose.connection.on("connected", ()=> console.log('Database is connected'))
        await mongoose.connect(`${process.env.MongoDB_URI}/chat-app`);
    } catch (error) {
        console.log(error);

    }
}