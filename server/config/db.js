const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/srmap-stationery', {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s if DB down
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Warning: ${error.message}`);
        console.warn('Continuing server startup (MongoDB may not be running locally)...');
    }
};

module.exports = connectDB;
