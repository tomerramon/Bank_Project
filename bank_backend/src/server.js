import "dotenv/config";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/mongodb.config.js";
import { destroyLimiters } from "./middlewares/rateLimit.middleware.js";

const port = process.env.PORT || 5000;
const host = process.env.HOST || "0.0.0.0";
const environment = process.env.NODE_ENV || "development";

let server;

async function startServer() {
	try {
		// 1. Connect to Database
		console.log(`Starting server in ${environment} mode...`);
		await connectDB();

		// 2. Start HTTP Server
		server = app.listen(port, host, () => {
			if (environment === "development") {
				console.log(`✅ Server running on ${host}:${port}`);
				console.log(`📍 Environment: ${environment}`);
				console.log(`🔗 Health check: http://localhost:${port}/health`);
			} else {
				console.log(`✅ Server running on http://localhost:${port}`);
			}
		});

		// Handle server errors
		server.on("error", (error) => {
			if (error.code === "EADDRINUSE") {
				console.error(`❌ Port ${port} is already in use`);
			} else {
				console.error("❌ Server error:", error);
			}
			process.exit(1);
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
}

// Graceful shutdown function
async function gracefulShutdown(signal) {
	console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
	
    destroyLimiters();

	if (server) {
		// Stop accepting new connections
		server.close(async () => {
			console.log("✅ HTTP server closed");

			// Close database connection
			await disconnectDB();

			console.log("✅ Graceful shutdown completed");
			process.exit(0);
		});

		// Force shutdown after 10 seconds
		setTimeout(() => {
			console.error("⚠️  Forced shutdown after timeout");
			process.exit(1);
		}, 10000);
	} else {
		await disconnectDB();
		process.exit(0);
	}
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	console.error("❌ Uncaught Exception:", error);
	gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
	gracefulShutdown("unhandledRejection");
});

// Start the server
startServer();
