import mongoose from 'mongoose';
const dbName = 'botsub'; //process.env.NODE_ENV === 'production' || 'stage' ? 'botsub' : 'development';

const connectDB = async () => {
  console.log('dbName: ', dbName);
  try {
    // @ts-expect-error
    const conn = await mongoose.connect(process.env.DB_CONNECTION_STR, {
      dbName: dbName,
      autoIndex: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.log('db string', process.env.DB_CONNECTION_STR);
    console.error(error.message);
    process.exit(1);
  };
};

export default connectDB; 