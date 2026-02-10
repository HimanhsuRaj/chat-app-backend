import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    fullName: {type: String, required: true},
    password: {type: String, required: true},
    profilePic: {type: String, default: ""},
    bio: {type: String},
    lastSeen: {
    type: Date,
    default: Date.now
  }
},{ timestamps: true});

const user = mongoose.model("User", userSchema);

export default user;