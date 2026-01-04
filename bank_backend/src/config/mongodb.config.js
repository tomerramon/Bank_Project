import monsgoose from 'mongoose';

export async function connectDB() {
    try {
        await monsgoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}