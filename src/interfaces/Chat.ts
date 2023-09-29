import {Document} from 'mongoose';
import {User} from './User';
import {Message} from './Message';

interface Chat extends Document {
	_id: string;
	created_date: Date;
	users: [User];
	messages: [Message];
}

export {Chat};
