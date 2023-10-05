import mongoose, {mongo} from 'mongoose';
import app from '../src/app';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';

// Interfaces
import {UserTest} from '../src/interfaces/User';
import {MessageTest} from '../src/interfaces/Message';

// Test functions
import {registerUser, loginUser, deleteUser, getUsers, getUserById} from './userTestFunc';
import {createMessage, deleteMessage, messageById, messageBySender} from './messageTestFunc';

// Connections

beforeAll(async () => {
	await mongoose.connect(process.env.DATABASE_URL as string);
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('Testing backend functions', () => {
	// Reg and login before all tests

	// Create random username user incase test fails and we lazy to delete user

	const username = 'testuser' + Math.floor(Math.random() * 1000).toString();
	const newUser: UserTest = {
		username: username,
		email: username + '@testeri.fi',
		password: 'testo' + username,
	};

	// Userdata for tokens etc.

	var userData: LoginMessageResponse;

	describe('Testing user reg/login', () => {
		it('should register a user', async () => {
			await registerUser(app, newUser);
		});

		it('should login a user', async () => {
			// Preserve userdata for later tests (token needed)
			userData = await loginUser(app, newUser);
		});
	});

	describe('Testing user functions', () => {
		// User to be used in tests

		it('should get users', async () => {
			await getUsers(app, userData);
		});

		it('should get a user by id', async () => {
			await getUserById(app, userData.user.id);
		});
	});

	// Tests for messages

	describe('Testing message functions', () => {
		let testMessage : MessageTest;
		it('should create a message', async () => {
			// Test message we input
			const message: MessageTest = {
				date: new Date(),
				content: 'test message',
				sender: userData.user.id as unknown as mongoose.Types.ObjectId,
			};

			testMessage = await createMessage(app, userData, message) as MessageTest;
		});

		it('should get a message by id', async () => {
			await messageById(app, testMessage.id as string);
		});

		it('should get messages by sender', async () => {
			await messageBySender(app, userData.user.id as string)
		});

		it('should delete a message', async () => {
			await deleteMessage(app, userData, testMessage.id as string);
		});

	});

	// Deletion test ( For user )

	describe('User can be deleted', () => {
		it('should delete a user', async () => {
			await deleteUser(app, userData);
		});
	});
});

