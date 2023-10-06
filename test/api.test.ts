import mongoose, {mongo} from 'mongoose';
import app from '../src/app';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';

// Interfaces
import {UserTest} from '../src/interfaces/User';
import {MessageTest} from '../src/interfaces/Message';

// Test functions
import {registerUser, loginUser, deleteUser, getUsers, getUserById} from './userTestFunc';
import {createMessage, deleteMessage, messageById, messageBySender} from './messageTestFunc';
import {createChat, deleteChat} from './chatTestFunc';
import { ChatTest } from '../src/interfaces/Chat';

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
	
	const adminUser = {
		username: 'admin',
		email: 'admin@test.fi',
		password: 'admin',
	};
	var adminUserData: LoginMessageResponse;
	var userData: LoginMessageResponse;

	// Userdata for tokens etc.
	
	
	describe('Testing user reg/login', () => {
		it('should register a user', async () => {
			await registerUser(app, newUser);
		});
		
		it('should login a user', async () => {
			// Preserve userdata for later tests (token needed)
			userData = await loginUser(app, newUser);
			adminUserData = await loginUser(app, adminUser);
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

	// Tests for chats

	let chat: ChatTest;

	describe('Testing chat functions', () => {
		it('should create a chat', async () => {
			chat = await createChat(app, userData, adminUserData,) as ChatTest;
		});


	});
	// Tests for messages
	
	describe('Testing message functions', () => {
		let testMessage : MessageTest;
		it('should create a message', async () => {
			// Test message we input
			const message: MessageTest = {
				content: 'test message',
				sender: userData.user.id as unknown as mongoose.Types.ObjectId,
			};
			
			testMessage = await createMessage(app, userData, message, chat.id as string) as MessageTest;
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


	// Deletion test ( For user and chat )

	describe('User can be deleted', () => {
		it('should delete a user', async () => {
			await deleteUser(app, userData);
		});
		it('should delete a chat (as admin', async () => {
			await deleteChat(app, adminUserData, chat);
		});
	});
});

