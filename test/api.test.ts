import mongoose from 'mongoose';
import app from '../src/app';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';

// Interfaces
import {UserTest} from '../src/interfaces/User';
import {MessageTest} from '../src/interfaces/Message';

// Test functions
import {registerUser, loginUser, deleteUser, getUsers, getUserById, likeUser, dislikeUser} from './userTestFunc';
import {
	createMessage,
	createMessageWithInvalidChatId,
	createMessageWithInvalidToken,
	createManyMessages,
	deleteMessage,
	deleteManyMessages,
	getMessages,
	messageByMessageId,
	messagesBySenderId,
	messagesBySenderToken,
	messageByInvalidMessageId,
	messagesByInvalidSenderId,
	messagesByInvalidSenderToken,
} from './messageTestFunc';
import {createChat, subscriteToChat, deleteChat} from './chatTestFunc';
import {ChatTest} from '../src/interfaces/Chat';

// Connections

beforeAll(async () => {
	await mongoose.connect(process.env.TEST_DATABASE_URL as string);
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

	//THIS USER NEED TO PRE-EXIST IN DATABASE AND HAVE ADMIN ROLE!
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
		it('should be able to like another user', async () => {
			await likeUser(app, adminUserData.token as string, userData.user.username);
		});
		it('should be able to dislike another user', async () => {
			await dislikeUser(app, adminUserData.token as string, userData.user.username);
		});
	});

	// Tests for chats

	let chat: ChatTest;

	describe('Testing chat functions', () => {
		it('should create a chat', async () => {
			chat = (await createChat(app, userData, adminUserData)) as ChatTest;
		});

		it('should subscribe to a chat', async () => {
			await subscriteToChat(app, chat.id as string);
		});
	});
	// Tests for messages

	describe('Testing message functions', () => {
		let testMessage: MessageTest;
		let testMessages: MessageTest[];
		it('should create a message', async () => {
			// Test message we input

			testMessage = (await createMessage(app, userData, chat.id as string)) as MessageTest;
		});

		it('should not create a message with invalid token', async () => {
			await createMessageWithInvalidToken(app, chat.id as string);
		});

		it('should not create a message with invalid chat id', async () => {
			await createMessageWithInvalidChatId(app, userData);
		});

		it('should get a message by id', async () => {
			await messageByMessageId(app, testMessage.id as string);
		});

		it('should not get a message by invalid id', async () => {
			await messageByInvalidMessageId(app, '123');
		});

		it('should get messages by sender id', async () => {
			await messagesBySenderId(app, userData.user.id as string);
		});

		it('should not get messages by invalid sender id', async () => {
			await messagesByInvalidSenderId(app, '123');
		});

		it('should get messages by sender token', async () => {
			await messagesBySenderToken(app, userData.token as string, userData.user.id as string);
		});

		it('should not get messages by invalid sender token', async () => {
			await messagesByInvalidSenderToken(app, '123');
		});

		it('should delete a message', async () => {
			await deleteMessage(app, userData, testMessage.id as string);
		});

		it('should create 10 messages', async () => {
			testMessages = await createManyMessages(app, userData, chat.id as string, 10);
		});

		it('should find multiple messages', async () => {
			await getMessages(app);
		}, 20000);

		it('should delete 10 messages', async () => {
			await deleteManyMessages(
				app,
				userData,
				testMessages.map((message) => message.id as string),
			);
		});
	});

	// Deletion test ( For user TODO: and chat )

	describe('User can be deleted', () => {
		it('should delete a user', async () => {
			await deleteUser(app, userData);
		});
		// it('should delete a chat (as admin', async () => {
		// 	await deleteChat(app, adminUserData, chat);
		// });
	});

	describe('Chat can be deleted', () => {
		it('should delete a chat (as admin', async () => {
			await deleteChat(app, adminUserData, chat);
		});
	});
});
