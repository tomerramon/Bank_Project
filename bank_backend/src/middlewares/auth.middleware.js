import { verifyAccessToken } from "../services/jwt.service.js";
import { InvalidTokenError } from "../utils/errors.util.js";
import { formatErrorResponse } from "../utils/response.util.js";

export function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res
			.status(401)
			.json(formatErrorResponse(new InvalidTokenError("Missing token")));
	}

	const [type, token] = authHeader.split(" ");
	if (type !== "Bearer" || !token) {
		return res
			.status(401)
			.json(
				formatErrorResponse(
					new InvalidTokenError("Invalid token format"),
				),
			);
	}

	try {
		const payload = verifyAccessToken(token);
		req.user = payload;
		next();
	} catch (error) {
		res.status(401).json(
			formatErrorResponse(
				new InvalidTokenError("Invalid or expired token"),
			),
		);
	}
}

export default authMiddleware;
