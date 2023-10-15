import mongoose from 'mongoose';
import {User} from '../../interfaces/User';

const userModel = new mongoose.Schema<User>({
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
	lastLogin: {
		type: Date,
	},
	role: {
		type: String,
		default: 'user',
	},
	likes: {
		type: Number,
		default: 0,
	},
});

//userModel.index({_id: 1}, {unique: true});

userModel.set('toJSON', {
	transform: (document, returnedObject) => {
		returnedObject.id = returnedObject._id;
		delete returnedObject._id;
		delete returnedObject.__v;
	},
});

export default mongoose.model<User>('User', userModel);
