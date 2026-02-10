import express from "express";
import { protectRoute, checkAuth } from "../middleware/auth.js";
import { login, signup, updateProfile, getUsers } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.get("/get-users", protectRoute, getUsers);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);


export default userRouter;