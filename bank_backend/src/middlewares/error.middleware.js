import { errorToResponse, getStatusCode } from "../utils/errors.util.js";

export function errorHandler(err, req, res, next) {
	console.error(`Error on ${req.method} ${req.path}:`, err.message);

	const statusCode = getStatusCode(err);

	if (res.headersSent) {
		return next(err);
	}

	res.status(statusCode).json(
		errorToResponse(err, process.env.NODE_ENV === "development"),
	);
}
