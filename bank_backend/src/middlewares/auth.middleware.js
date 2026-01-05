import {verifyToken} from '../services/jwt.service.js';

export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Missing token' });
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Invalid token format' });
    }

    try {
        const payload  = verifyToken(token);
        req.user = payload ;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

export default authMiddleware;