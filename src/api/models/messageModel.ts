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

export default mongoose.model<Message>('Message', messageModel);
