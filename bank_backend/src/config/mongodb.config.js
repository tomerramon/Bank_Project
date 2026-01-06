import mongoose from 'mongoose';

// Connection options for production-ready setup
const options = {
    maxPoolSize: 10,          // Maximum number of connections in pool
    minPoolSize: 2,           // Minimum number of connections
    socketTimeoutMS: 45000,   // Close sockets after 45 seconds of inactivity
    serverSelectionTimeoutMS: 5000, // Timeout for server selection
    family: 4                 // Use IPv4, skip trying IPv6
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
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
            isConnected = true;
        });

    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error.message);
        
        // In production, you might want to retry instead of exiting
        if (process.env.NODE_ENV === 'production') {
            console.log('⏳ Retrying connection in 5 seconds...');
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
        console.log('✅ MongoDB connection closed gracefully');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        throw error;
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
});