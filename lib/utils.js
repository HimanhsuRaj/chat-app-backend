import jwt from "jsonwebtoken";

// Function to generate a token for a user

export const generateToken = (userId) => {
    // Use the same env var name as other parts of the app (JWT_SECRET)
    const token = jwt.sign({userId}, process.env.JWT_SECRET);
    return token;
}