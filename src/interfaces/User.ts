import {Document} from 'mongoose';

interface User extends Document {
	id: string;
	username: string;
	email: string;
	password: string;
	description?: string;
	avatar?: string;
	role: string;
	lastLogin: Date;
}

interface UserIdWithToken {
	id: string;
	token: string;
	role: string;
}

interface OutputUser {
	id: string;
	username: string;
	email: string;
	password: string;
}

interface TokenUser {
	id: string;
	role: string;
}

export {User, UserIdWithToken, OutputUser, TokenUser};
