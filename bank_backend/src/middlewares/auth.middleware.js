import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_ACCESS_SECRET;

export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decodedPayload = jwt.verify(token, SECRET_KEY);
        req.user = decodedPayload;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

export default authMiddleware;