import mongoose from "mongoose";
import { DATABASE, isProduction } from "./constants.config.js";

// Connection options for production-ready setup
const options = {
	dbName: "bankDB",
	maxPoolSize: DATABASE.CONNECTION_POOL_SIZE_MAX, // Maximum number of connections in pool
	minPoolSize: DATABASE.CONNECTION_POOL_SIZE_MIN, // Minimum number of connections
	socketTimeoutMS: DATABASE.SOCKET_TIMEOUT_MS, // Close sockets after 45 seconds of inactivity
	serverSelectionTimeoutMS: DATABASE.SERVER_SELECTION_TIMEOUT_MS, // Timeout for server selection
	family: 4, // Use IPv4, skip trying IPv6
};

let isConnected = false;

export async function connectDB() {
	// Prevent multiple connections
	if (isConnected) {
		console.log("Using existing MongoDB connection");
		return;
	}

	try {
		const conn = await mongoose.connect(process.env.MONGODB_URI, options);

		isConnected = true;
		console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);

		// Monitor connection status
		mongoose.connection.on("disconnected", () => {
			console.warn("⚠️  MongoDB disconnected");
			isConnected = false;
		});

		mongoose.connection.on("error", (err) => {
			console.error("❌ MongoDB connection error:", err);
		});

		mongoose.connection.on("reconnected", () => {
			console.log("✅ MongoDB reconnected");
			isConnected = true;
		});
	} catch (error) {
		console.error("❌ Error connecting to MongoDB:", error.message);

		// In production, you might want to retry instead of exiting
		if (isProduction()) {
			console.log("⏳ Retrying connection in 5 seconds...");
			setTimeout(connectDB, 5000);
		} else {
			process.exit(1);
		}
	}
}

// Graceful shutdown
export async function disconnectDB() {
	if (!isConnected) {
		return;
	}

	try {
		await mongoose.connection.close();
		isConnected = false;
		console.log("✅ MongoDB connection closed gracefully");
	} catch (error) {
		console.error("❌ Error closing MongoDB connection:", error);
		throw error;
	}
}
