import mongoose from 'mongoose';
import {Chat} from '../../interfaces/Chat';

const chatModel = new mongoose.Schema<Chat>({
	created_date: {
		type: Date,
		required: true,
	},
	users: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	],
	messages: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Message',
			required: true,
		},
	],
});

chatModel.set('toJSON', {
	transform: (document, returnedObject) => {
		returnedObject.id = returnedObject._id;
		delete returnedObject._id;
		delete returnedObject.__v;
	},
});

export default mongoose.model<Chat>('Chat', chatModel);
