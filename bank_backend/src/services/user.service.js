import bcrypt, { hashSync } from "bcryptjs";
// import { users } from "../config/local_users.config.js";
import Users from '../models/user.model.js';

export function FindUserByEmail(email) {
    return Users.find(u => u.email === email);
}


export function CreateUserLocal(email, password) {
    const isExists = FindUserByEmail(email);
    if (isExists) {
        throw new Error("User already exists with this email.");
    }

    const hashedPassword = HashPassword(password);
    const balance = Math.floor(Math.random() * 10000); // Random initial balance
    const newUser = {
        id: Date.now().toString(),
        email: email,
        password: hashedPassword,
        balance: balance,
        verified: true // For simplicity, mark as verified
    };
 
    users.push(newUser);
    return newUser;
}

export async function createUser(email, password, phone) {
    if (!email || !password || !phone) {
        throw new Error("Missing required fields.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    try{
        const newUser = new Users.create({
            email,
            hashedPassword,
            phone,
        });

        return newUser;
    }
    catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern.email) {
                throw new Error("Email already in use.");
            }
            if (error.keyPattern.phone) {
                throw new Error("Phone number already in use.");
            }
        }
        throw error;
    }
}