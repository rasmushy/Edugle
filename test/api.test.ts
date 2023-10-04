import mongoose from 'mongoose';
import {registerUser, loginUser} from './userTestFunc';
import {UserTest} from '../src/interfaces/User';
import app from '../src/app';

describe('Testing user functions', () => {
	beforeAll(async () => {
		await mongoose.connect(process.env.DATABASE_URL as string);
	});

	afterAll(async () => {
		await mongoose.connection.close();
	});
	const username = 'testuser' + Math.floor(Math.random() * 1000).toString();

	// Create test user
	const newUser: UserTest = {
		username: username,
		email: username + '@testeri.fi',
		password: 'testo',
	};

	it('should register a user', async () => {
		await registerUser(app, newUser);
	});

	it('should login a user', async () => {
		const user = await loginUser(app, newUser);
		console.log('user', user);
	});
});
