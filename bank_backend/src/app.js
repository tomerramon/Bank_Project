const express = require('express');

const app = express();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transaction");


// Middleware
app.use(express.json());

// Main routes:
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/transactions", transactionRoutes);

module.exports = app;