import mongoose from 'mongoose';
import express from 'express';
import { refreshWinnerCountsW } from '../bot/grand_slam_offer/whatsapp/number_of_winners_logic_w';

let server: any; // store the server instance

const connectDB = async (app: express.Application, port: number) => {
  const dbURI = process.env.DB_CONNECTION_STR;
  const dbName = process.env.DB_NAME;

  if (!dbURI) {
    console.error('Database connection string is missing.');
    process.exit(1);
  }

  const connect = async () => {
    try {
      // Check if already connected
      if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        console.log('MongoDB is already connected or is connecting.');
      } else {
        const conn = await mongoose.connect(dbURI, {
          dbName,
          autoIndex: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      }

      // Start Express app only if not already listening
      if (!server || !server.listening) {
        server = app.listen(port, () => {
          console.log(`Server running on port ${port}`);
        });
      }

      //refreshWinnerCountsW();

      // Handle disconnection and auto-reconnect
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected! Attempting to reconnect...');
        connect(); // Auto-reconnect
      });
    } catch (error: any) {
      console.error('Error connecting to MongoDB:', error.message);
      setTimeout(connect, 5000); // Retry after 5 seconds
    }
  };

  await connect();
};

export default connectDB;
