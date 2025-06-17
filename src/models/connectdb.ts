import mongoose from 'mongoose';
const dbName = 'development'; //process.env.DB_NAME; //process.env.NODE_ENV === 'production' || 'stage' ? 'botsub' : 'development';
import express from 'express';
import { refreshWinnerCounts } from '../bot/grand_slam_offer/whatsapp/number_of_winners_logic_w';

const connectDB = async (app: express.Application, port: number) => {
  const dbURI = process.env.DB_CONNECTION_STR;
  const dbName = process.env.DB_NAME;

  if (!dbURI) {
    console.error('Database connection string is missing.');
    process.exit(1);
  }

  const connect = async () => {
    try {
      const conn = await mongoose.connect(dbURI, {
        dbName,
        autoIndex: true,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);

      // Start Express app only after DB is connected
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });

      refreshWinnerCounts();
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
