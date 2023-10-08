import {Types, Document} from 'mongoose';
import {User, UserTest} from './User';

interface Message extends Document {
	date: Date;
	content: string;
	sender: Types.ObjectId | User;
}
interface newMessage extends Document {
	date: Date;
	content: string;
	senderToken: string;
}

interface MessageTest {
	id?: string;
	date?: Date;
	content?: string;
	sender?: Types.ObjectId | UserTest;
}

export {Message, newMessage, MessageTest};
