import 'dotenv/config';
import app from './app.js';
import {connectDB} from "./config/mongodb.config.js";

const port = process.env.PORT || 5000;


// Connect to DB:
await connectDB();

// Start server:
app.listen(port, ()=>{
    console.log(`Server running on: http://localhost:${port}`);
});