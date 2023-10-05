import mongoose from 'mongoose';
import {Message} from '../../interfaces/Message';

const messageModel = new mongoose.Schema<Message>({
	date: {
		type: Date,
		required: true,
	},
	content: {
		type: String,
		required: true,
	},
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
});

messageModel.set('toJSON', {
	transform: (document, returnedObject) => {
		returnedObject.id = returnedObject._id;
		delete returnedObject._id;
		delete returnedObject.__v;
	},
});

export default mongoose.model<Message>('Message', messageModel);
