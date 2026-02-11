import jwt from "jsonwebtoken";
import { AUTH } from "../config/constants.config.js";

export function generateAccessToken(user) {
	return jwt.sign(
		{
			id: user.id,
			email: user.email,
		},
		process.env.JWT_ACCESS_SECRET,
		{ expiresIn: AUTH.ACCESS_TOKEN_EXPIRY },
	);
}

export function generateRefreshToken(user) {
	return jwt.sign(
		{
			id: user.id,
		},
		process.env.JWT_REFRESH_SECRET,
		{ expiresIn: AUTH.REFRESH_TOKEN_EXPIRY },
	);
}

export function verifyAccessToken(token) {
	return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
	return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
