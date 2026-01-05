import { AuthenticateUser } from '../services/auth.service.js';


export async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        const result = await AuthenticateUser(email, password);
        res.status(200).json({
            msg: "User authenticated successfully",
            authData: result
        });
    } catch (error) {
        res.status(401).json({
            msg: "Authentication failed",
            error: error.message
        });
    }
}

