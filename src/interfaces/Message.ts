import {Types, Document} from 'mongoose';
import {User} from './User';

interface Message extends Document {
	_id: string;
	date: Date;
	content: string;
	sender: Types.ObjectId | User;
}

export {Message};
