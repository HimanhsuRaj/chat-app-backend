import cloudinary from "../lib/cloudinary.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import { io, userSocketMap } from "../server.js";
import fs from "fs";



// Get all users expect the logged in user


export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: userId}}).select("-password");

        // Count number of messages not seen
        const unseenMessages = {}
        const promises = filteredUsers.map(async (user) =>{
            const messages = await Message.find({senderId: user._id, receiverId: userId, seen:  false})
            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        })
        await Promise.all(promises);
        res.json({success: true, users: filteredUsers, unseenMessages})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
        
    }
}

// Get all messages for selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id; 

        const messages = await Message.find({
            $or: [
                {senderId: myId, receiverId: selectedUserId},
                {senderId: selectedUserId, receiverId: myId},
            ]
        })
        await Message.updateMany({senderId: selectedUserId, receiverId: myId},
            {seen: true});
        res.json({success: true, messages})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// api to mark messages as seen using message id
export const markMessagesAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, {seen: true})
        res.json({success: true});
    } catch (error) {
       console.log(error.message);
        res.json({success: false, message: error.message}) 
    }
}

// Send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req .body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl ;
        if (image){
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url;

        }
        const newMessage = await Message.create({
            senderId, receiverId, text, image: imageUrl
        })
        res.json ({success: true, newMessage});

        // Emit the new message to the receiver's socket
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

    } catch (error) {
         console.log(error.message);
        res.json({success: false, message: error.message}) 
    }
}


export const sendAudioMessage = async (req, res) => {
  try {
    const { receiverId, senderId } = req.body;

    // Upload to Cloudinary (audio/video resource type)
    const cloud = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "chat-audio"
    });

    // Remove temp file
    fs.unlinkSync(req.file.path);

    const message = await Message.create({
      senderId,
      receiverId,
      type: "audio",
      status: "sent",
      audioUrl: cloud.secure_url,
      cloudinaryId: cloud.public_id
    });

    res.json(message);

    // Emit the new audio message to the receiver's socket
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const deleteAudioMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) return res.status(404).json({ message: "Message not found" });

    // Delete from Cloudinary  
    await cloudinary.uploader.destroy(message.cloudinaryId, {
      resource_type: "video"
    });

    // Delete from DB
    await Message.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Audio deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};