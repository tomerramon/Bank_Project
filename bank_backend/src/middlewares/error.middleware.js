import { errorToResponse, getStatusCode } from "../utils/errors.util.js";

export function errorHandler(err, req, res, next) {
	console.error("Unhandled error:", err);

	const statusCode = getStatusCode(err);

	res.status(statusCode).json(
		errorToResponse(err, process.env.NODE_ENV === "development"),
	);
}
