const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using the MONGO_URI environment variable.
 * Uses connection pooling and retry logic for production resilience.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,          // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout after 10s if no server found
      socketTimeoutMS: 5000,   // Close sockets after 45s of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
