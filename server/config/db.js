const mongoose = require('mongoose');

const connectDB = async () => {
    const conn = await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/srmap-stationery',
        { serverSelectionTimeoutMS: 5000 }
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
};

module.exports = connectDB;
