import { hashSync } from "bcryptjs";
import { users } from "../config/local_users.config.js";

export function FindUserByEmail(email) {
    return users.find(user => user.email === email);
}

// function ComparePassword(inputPassword, storedHashedPassword) {
//     return bcrypt.compareSync(inputPassword, storedHashedPassword);
// }

function HashPassword(password) {
    return hashSync(password);
}

export function CreateUser(email, password) {
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
