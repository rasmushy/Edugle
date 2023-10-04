import mongoose from 'mongoose';
import {registerUser, loginUser, deleteUser, getUser} from './userTestFunc';
import {UserTest} from '../src/interfaces/User';
import app from '../src/app';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';

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
	let user: LoginMessageResponse;

	it('should register a user', async () => {
		await registerUser(app, newUser);
	});

	it('should login a user', async () => {
		user = await loginUser(app, newUser);
	});

	it('should delete a user', async () => {
		await deleteUser(app, user);
	});
});
