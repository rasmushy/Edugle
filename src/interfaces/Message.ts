import {Types, Document} from 'mongoose';
import {User, UserTest} from './User';

interface Message extends Document {
	date: Date;
	content: string;
	sender: Types.ObjectId | User;
}

interface MessageTest {
	id?: string;
	date?: Date;
	content?: string;
	sender?: Types.ObjectId | UserTest;
}

export {Message, MessageTest};
