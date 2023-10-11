import {Types, Document} from 'mongoose';
import {User, UserTest} from './User';

interface QueueEntry extends Document {
	userId: Types.ObjectId | User;
	position: number;
	joinedAt: Date;
}
/*  */
interface QueueEntryTest {
	userId?: Types.ObjectId | UserTest;
	position?: number;
}

interface QueueResponse {
	position?: number;
	status: string;
	chatId?: string;
}
interface QueueSubscriptionUpdate {
	userId: Types.ObjectId | User;
	newPosition: number;
}

export {QueueEntry, QueueEntryTest, QueueResponse, QueueSubscriptionUpdate};
