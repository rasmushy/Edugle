import {Document} from 'mongoose';

interface User extends Document {
	_id: string;
	username: string;
	email: string;
	password: string;
	description?: string;
	avatar?: string;
}

interface UserIdWithToken {
	id: string;
	token: string;
	role: 'admin' | 'user';
}

interface OutputUser {
	id: string;
	user_name: string;
	email: string;
}

interface TokenUser {
	id: string;
	role: 'admin' | 'user';
}

export {User, UserIdWithToken, OutputUser, TokenUser};
