import { verifyAccessToken } from "../services/jwt.service.js";
import { formatErrorResponse } from "../utils/response.util.js";

export function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		// return res.status(401).json({ message: "Missing token" });
		return res
			.status(401)
			.json(formatErrorResponse(new Error("Missing token")));
	}

	const [type, token] = authHeader.split(" ");
	if (type !== "Bearer" || !token) {
		return res
			.status(401)
			.json(formatErrorResponse(new Error("Invalid token format")));
	}

	try {
		const payload = verifyAccessToken(token);
		req.user = payload;
		next();
	} catch (error) {
		res.status(401).json(
			formatErrorResponse(new Error("Invalid or expired token")),
		);
	}
}

export default authMiddleware;
