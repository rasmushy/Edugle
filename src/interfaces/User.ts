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

interface ModifyUser {
	id: string;
	role: string;
}

interface AdminIdWithToken {
	id: string;
	token: string;
	role: string;
}

interface OutputUser {
	id: string;
	username: string;
	email: string;
	password?: string;
	description?: string;
	role?: string;
}

interface TokenUser {
	id: string;
	role: string;
}

interface UserTest {
	id?: string;
	username?: string;
	email?: string;
	password?: string;
	description?: string;
	avatar?: string;
	role?: string;
	lastLogin?: Date;
}

export {User, UserIdWithToken, AdminIdWithToken, OutputUser, TokenUser, UserTest, ModifyUser};
