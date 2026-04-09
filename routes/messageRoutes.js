import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { getMessages, getUsersForSidebar, markMessagesAsSeen, sendMessage,sendAudioMessage, deleteAudioMessage, addReaction, removeReaction } from "../controllers/messageController.js";
import multer from "multer";


const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark:id", protectRoute, markMessagesAsSeen);
messageRouter.post("/send/:id", protectRoute, sendMessage);
// Multer - store audio temporarily
const upload = multer({ dest: "uploads/" });

// Upload audio → Cloudinary
messageRouter.post("/audio", upload.single("audio"), sendAudioMessage);

// Delete audio msg
messageRouter.delete("/:id", deleteAudioMessage);

// Reactions
messageRouter.post("/:id/reactions", protectRoute, addReaction);
messageRouter.delete("/:id/reactions", protectRoute, removeReaction);

export default messageRouter;