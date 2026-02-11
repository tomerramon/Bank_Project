/**
 * Response Utilities
 *
 * Standardizes API response formats.
 *
 */

/**
 * Format error response
 * Consistent error format across all endpoints
 *
 * @param {Error} error - Error object
 * @returns {Object} - Formatted error response
 */
export function formatErrorResponse(error) {
	return {
		success: false,
		message: error.message || "An error occurred",
		...(error.errors && { errors: error.errors }),
		...(error.details && { details: error.details }),
	};
}

/**
 * Format success response
 *
 * @param {string} message - Success message
 * @param {Object} data - Response data (optional)
 * @returns {Object} - Formatted success response
 */
export function formatSuccessResponse(message, data = null) {
	return {
		success: true,
		message,
		...(data && { data }),
	};
}

/**
 * Format paginated response
 *
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination info
 * @returns {Object} - Formatted paginated response
 */
export function formatPaginatedResponse(items, pagination) {
	return {
		success: true,
		data: items,
		pagination,
	};
}
