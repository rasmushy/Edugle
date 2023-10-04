import mongoose from 'mongoose';
import {User} from '../../interfaces/User';

const messageModel = new mongoose.Schema<User>({
	username: {
		type: String,
		required: true,
		minLength: 3,
	},
	email: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: false,
		maxLength: 50,
	},
	avatar: {
		type: String,
		required: false,
	},
	role: {
		type: String,
		default: 'user',
	},
});

export default mongoose.model<User>('User', messageModel);
