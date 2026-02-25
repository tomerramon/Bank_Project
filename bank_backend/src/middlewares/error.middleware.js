import { isDevelopment } from "../config/constants.config.js";
import {
	errorToResponse,
	formatErrorForLogging,
	getStatusCode,
	isOperationalError,
} from "../utils/errors.util.js";

export function errorHandler(err, req, res, next) {
	// Log operational errors as warnings, programming bugs as errors
	if (isOperationalError(err)) {
		console.warn(
			`⚠️  Operational error on ${req.method} ${req.path}:`,
			formatErrorForLogging(err),
		);
	} else {
		console.error(
			`❌ Unexpected error on ${req.method} ${req.path}:`,
			formatErrorForLogging(err),
		);
	}

	const statusCode = getStatusCode(err);

	if (res.headersSent) {
		return next(err);
	}

	res.status(statusCode).json(errorToResponse(err, isDevelopment()));
}
