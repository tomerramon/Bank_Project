import { compareSync } from "bcryptjs";
import { FindUserByEmail } from "./user.services.js";
import { GenerateToken } from "./jwt.services.js";

export async function AuthenticateUser(email, password) {
    const user = FindUserByEmail(email);
    if (!user) {
        throw new Error("Authentication failed: User not found.");
    }

    const isPasswordValid = compareSync(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Authentication failed: Incorrect password.");
    }

    return GenerateToken(user);
}
