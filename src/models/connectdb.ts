import mongoose from 'mongoose';
const dbName = 'development'; //process.env.DB_NAME; //process.env.NODE_ENV === 'production' || 'stage' ? 'botsub' : 'development';

const connectDB = async () => {
  try {
    console.log('dbName: ', process.env.DB_NAME);

    // @ts-expect-error
    const conn = await mongoose.connect(process.env.DB_CONNECTION_STR, {
      // @ts-ignore
      dbName: process.env.DB_NAME,
      autoIndex: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.log('db string', process.env.DB_CONNECTION_STR);
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
