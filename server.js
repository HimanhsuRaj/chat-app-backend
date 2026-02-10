import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import Message from "./models/message.js";
import User from "./models/user.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://chat-apps-frontend.vercel.app",
  "https://chat-apps-blond-one.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(
        new Error(`CORS policy: Origin ${origin} not allowed.`),
        false,
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
    optionsSuccessStatus: 200,
  }),
);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export const userSocketMap = {};
export const activeChatMap = {};

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userid;
  

  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.userId = userId;

    console.log(`🟢 ${userId} connected`);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ✅ Deliver pending messages
    const pending = await Message.find({
      receiverId: userId,
      status: "sent",
    });

    for (const msg of pending) {
      await Message.findByIdAndUpdate(msg._id, { status: "delivered" });

      const senderSocket = userSocketMap[msg.senderId];
      if (senderSocket) {
        io.to(senderSocket).emit("message-status", {
          messageId: msg._id,
          status: "delivered",
        });
      }
    }
  }

  // ---------------- TYPING ----------------
  socket.on("typing", ({ toUserId }) => {
    const receiverSocketId = userSocketMap[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { from: socket.userId });
    }
  });

  socket.on("stop_typing", ({ toUserId }) => {
    const receiverSocketId = userSocketMap[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop_typing", { from: socket.userId });
    }
  });

  // ---------------- CALLS ----------------
  socket.on("call-user", ({ to, from, peerId }) => {
    const targetSocket = userSocketMap[to];
    if (targetSocket)
      io.to(targetSocket).emit("incoming-call", { from, peerId });
  });

  socket.on("accept-call", ({ to }) => {
    const targetSocket = userSocketMap[to];
    if (targetSocket) io.to(targetSocket).emit("call-accepted");
  });

  socket.on("reject-call", ({ to }) => {
    const targetSocket = userSocketMap[to];
    if (targetSocket) io.to(targetSocket).emit("call-rejected");
  });

  socket.on("end-call", ({ to }) => {
    const targetSocket = userSocketMap[to];
    if (targetSocket) io.to(targetSocket).emit("call-ended");
    socket.emit("call-ended");
  });

  // ---------------- MESSAGE SEND ----------------
  socket.on("send-message", async ({ message }) => {
  const receiverSocketId = userSocketMap[message.receiverId];

  // show sent immediately to sender
  io.to(socket.id).emit("receive-message", {
    ...message,
    status: "sent",
  });

  if (receiverSocketId) {
    const isReceiverInChat =
      activeChatMap[message.receiverId] === message.senderId;

    if (isReceiverInChat) {
      // 👉 directly READ
      await Message.findByIdAndUpdate(message._id, { status: "read" });

      io.to(receiverSocketId).emit("receive-message", {
        ...message,
        status: "read",
      });

      io.to(socket.id).emit("message-status", {
        messageId: message._id,
        status: "read",
      });
    } else {
      // 👉 only DELIVERED
      await Message.findByIdAndUpdate(message._id, { status: "delivered" });

      io.to(receiverSocketId).emit("receive-message", {
        ...message,
        status: "delivered",
      });

      io.to(socket.id).emit("message-status", {
        messageId: message._id,
        status: "delivered",
      });
    }
  }
});


  // ---------------- READ ----------------
  socket.on("read-messages", async ({ fromUserId, toUserId }) => {
    await Message.updateMany(
      {
        senderId: fromUserId,
        receiverId: toUserId,
        status: { $ne: "read" },
      },
      { status: "read" },
    );

    const senderSocket = userSocketMap[fromUserId];
    if (senderSocket) {
      io.to(senderSocket).emit("messages-read", {
        fromUserId: toUserId,
      });
    }
  });

  socket.on("join-chat", ({ userId, chattingWith }) => {
  activeChatMap[userId] = chattingWith;
});

socket.on("leave-chat", ({ userId }) => {
  delete activeChatMap[userId];
});

  
  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", async () => {
    if (userId && userSocketMap[userId]) {
      delete userSocketMap[userId];
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      console.log(`🔴 ${userId} disconnected`);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

app.use(express.json({ limit: "4mb" }));

app.use("/api/status", (req, res) => res.send("Server is Live ✅"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

const peerServer = ExpressPeerServer(server, { path: "/" });
app.use("/peerjs", peerServer);

await connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));


export default server;
