const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.warn(`⚠ MongoDB not available: ${error.message}`);
    console.warn('  The server will start, but database operations will fail.');
    console.warn('  Install & start MongoDB: https://www.mongodb.com/docs/manual/installation/');
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

const getDBStatus = () => isConnected;

module.exports = { connectDB, disconnectDB, getDBStatus };
