import mongoose from 'mongoose';
import {UserTest} from '../src/interfaces/User';
import app from '../src/app';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';

// User test functions

import {registerUser, loginUser, deleteUser, getUsers, getUserById} from './userTestFunc';

describe('Testing user functions', () => {
	// Connections

	beforeAll(async () => {
		await mongoose.connect(process.env.DATABASE_URL as string);
	});

	afterAll(async () => {
		await mongoose.connection.close();
	});

	// Create random username incase test fails and we lazy to delete user

	const username = 'testuser' + Math.floor(Math.random() * 1000).toString();

	// Create test user

	const newUser: UserTest = {
		username: username,
		email: username + '@testeri.fi',
		password: 'testo',
	};

	// User to be used in tests
	let userData: LoginMessageResponse;

	it('should register a user', async () => {
		await registerUser(app, newUser);
	});

	it('should login a user', async () => {
		userData = await loginUser(app, newUser);
	});
	it('should get users', async () => {
		await getUsers(app, userData);
	});

	it('should get a user by id', async () => {
		await getUserById(app, userData.user.id);
	});

	it('should delete a user', async () => {
		await deleteUser(app, userData);
	});
});
