import jwt from 'jsonwebtoken';


export function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );
}

export function generateRefreshToken(user) {
    return jwt.sign(
        {
            id: user.id,
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );
}

export function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
