import User from "../models/user.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";



// signup a new user


export const signup = async (req, res) =>{
    const { fullName, email, password, bio } = req.body;

    try {
        if (!fullName || !email || !password || !bio) {
            return res.json({success: false, message: "Missing details"})
        }
        const user = await User.findOne({email});
        if (user) {
            return res.json({success: false, message: "Account already exists"})
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName, email, password: hashedPassword, bio
        });

        const token = generateToken(newUser._id)
        res.json({success: true, userData: newUser, token, message: "Account created successfully"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Controller for login a user

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({email});

        if (!userData) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordCorrrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrrect) {
            return res.json({success: false, message: "Invalid credentials"});
        }

        const token = generateToken(userData._id);
        res.json({success: true, userData, token, message: "Login successfully"})

    } catch (error) {
         console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Controller to update user profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullname} = req.body;

        const userId = req.user._id;
        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(userId, {bio, fullname}, {new: true});
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(userId, {
                profilePic: upload.secure_url,
                bio,
                fullname
            }, {new: true});
        }
        res.json({ success: true, user: updatedUser})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
        
    }
}

// Controller to get all users for sidebar
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const users = await User.find(
      { _id: { $ne: currentUserId } },   // exclude logged-in user
      "_id fullName profilePic lastSeen" // INCLUDE lastSeen
    );

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
