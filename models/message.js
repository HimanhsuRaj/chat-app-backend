import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    receiverId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    text: {type: String},
    image: {type: String},
    audioUrl: {type: String},
    cloudinaryId: {type: String},
    type: {type: String, default: "text"},
    status: {
  type: String,
  enum: ["sent", "delivered", "read"],
  default: "sent",
},

},{ timestamps: true});

const Message = mongoose.model("Message", messageSchema);

export default Message;