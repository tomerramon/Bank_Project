import express, { json } from 'express';
import cookieParser from 'cookie-parser';

const app = express();

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import transactionRoutes from "./routes/transaction.route.js";


// Middleware:
app.use(json());
app.use(cookieParser());

// Main routes:
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/transactions", transactionRoutes);

export default app;