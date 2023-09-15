import mongoose from 'mongoose';
import 'dotenv/config';

const mongoConnect = async () => {
	const connection = await mongoose.connect(process.env.DATABASE_URL as string);
	console.log('DB connected successfully');
	return connection;
};

export default mongoConnect;
