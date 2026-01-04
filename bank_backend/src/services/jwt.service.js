import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_ACCESS_SECRET;

export function GenerateToken(user) 
{
    return jwt.sign(
        { id: user.id, email: user.email },
        SECRET_KEY,
        { expiresIn: "1h" }
    );
}

// export default { GenerateToken };