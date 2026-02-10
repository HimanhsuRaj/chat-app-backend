# Chat App — Server

This folder contains the Express + Node (ESM) backend for the chat application. It exposes REST endpoints for authentication and messaging and also runs a Socket.IO server for realtime presence and messages.

## Stack
- Node.js (ESM)
- Express
- MongoDB (mongoose)
- Socket.IO
- Cloudinary (for image uploads)

## Quick start (Windows / PowerShell)
```powershell
cd C:\Users\himan\Chat_app\server
npm install
npm run server
```
The server uses nodemon in development (script: `npm run server`).

## Environment variables (examples)
Create a `.env` in the `server` folder with the following keys (adjust values for your environment):

```
MONGO_URI=mongodb://localhost:27017/chat_app
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=5000
```

## Main responsibilities / functionality
- User signup / login — hashed passwords (bcrypt) and JWT issuance.
- Profile updates — accepts a base64 image, uploads to Cloudinary, and stores `profilePic` URL.
- Message CRUD — fetch messages for a conversation, mark messages as seen, send messages.
- Realtime presence and new message notifications via Socket.IO.

## API endpoints (mounted under `/api`)
> Note: The server mounts the user router under `/api/auth` and message router under `/api/messages`.

Auth (user) routes (in `routes/userRoutes.js`)
- POST `/api/auth/signup` — create an account. Body: `{ fullName, email, password, bio }`.
- POST `/api/auth/login` — login. Body: `{ email, password }`. Response contains `token` and `userData`.
- PUT `/api/auth/update-profile` — update `profilePic`, `bio`, `fullName` (protected).
- GET `/api/auth/check` — validate token and return user (`protectRoute` must be used by client).

Message routes (in `routes/messageRoutes.js`)
- GET `/api/messages/users` — returns users list and unseen message counts for sidebar (protected).
- GET `/api/messages/:id` — get conversation messages between authenticated user and `:id` (protected).
- PUT `/api/messages/mark:id` — mark a message as seen (note: this route is implemented as `/mark:id` in code; consider changing to `/mark/:id`).
- POST `/api/messages/send/:id` — send a message to user `:id` (protected).

## Socket.IO events and usage
- Server creates a Socket.IO server and stores mapping `userSocketMap[userId] = socketId`.
- Clients connect using `io(backendUrl, { query: { userId } })`.
- Server emits `getOnlineUsers` with list of userIds currently online.
- When a message is sent, the server emits `newMessage` to the receiver's socket id.

## Auth header convention used by this codebase
- The middleware looks for the JWT in `req.headers.token` (i.e. the client sets `axios.defaults.headers.common['token'] = token`).
- Recommendation: consider standardizing to `Authorization: Bearer <token>`.

## Known quirks / places to verify
- ESM imports require `.js` extensions on local imports (e.g. `import User from "../models/user.js"`). If you see `ERR_MODULE_NOT_FOUND`, check import paths and `.js` extensions.
- Message mark route: currently implemented as `/mark:id` — contains a minor bug; change to `/mark/:id` in `routes/messageRoutes.js` and adjust client requests accordingly.

## Troubleshooting
- If the server fails to start with `ERR_MODULE_NOT_FOUND`, ensure local imports include `.js` and `package.json` contains `"type": "module"`.
- If the client shows 404 on `/api/auth/*`, confirm the server is running and `VITE_BACKEND_URL` points to the correct host/port.
- If realtime features don't work, confirm:
  - Socket.io server is listening (server logs)
  - Client connects with correct backend URL
  - CORS allows the client origin

## Next improvements
- Use a consistent header (`Authorization`) for tokens.
- Add validation and better error messages on controllers.
- Add unit/integration tests for auth and messaging flows.


If you'd like, I can also add a minimal Postman collection or automated smoke tests for the main endpoints.
