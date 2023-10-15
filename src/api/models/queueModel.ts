import mongoose from 'mongoose';
import {QueueEntry} from '../../interfaces/Queue';

const queueSchema = new mongoose.Schema<QueueEntry>({
	joinedAt: {
		type: Date,
		required: true,
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
});

queueSchema.index({joinedAt: 1}, {expireAfterSeconds: 1800});

queueSchema.set('toJSON', {
	transform: (_document, returnedObject) => {
		returnedObject.id = returnedObject._id;
		delete returnedObject._id;
		delete returnedObject.__v;
	},
});

export default mongoose.model<QueueEntry>('Queue', queueSchema);
