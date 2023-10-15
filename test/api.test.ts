import mongoose from 'mongoose';
import app from '../src/app';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';

// Interfaces
import {UserTest} from '../src/interfaces/User';
import {MessageTest} from '../src/interfaces/Message';
import {ChatTest} from '../src/interfaces/Chat';

// Test functions
import {
	registerUser,
	registerUserWithExistingCredentials,
	loginUser,
	loginUserWithIncorrectCredentials,
	deleteUser,
	deleteUserWithIncorrectToken,
	deleteUserAsAdmin,
	deleteUserAsAdminWithOutAdminToken,
	getUsers,
	getUserByToken,
	getUserByIncorrectToken,
	getUserByIncorrectId,
	getUserById,
	likeUser,
	dislikeUser,
	modifyUser,
	modifyUserWithIncorrectToken,
	modifyUserAsAdmin,
	modifyUserAsAdminWithIncorrectToken,
} from './userTestFunc';
import {
	createMessage,
	createMessageWithInvalidChatId,
	createMessageWithInvalidToken,
	createManyMessages,
	deleteMessage,
	deleteManyMessages,
	deleteMessageAsAdmin,
	deleteMessageAsAdminButUser,
	deleteMessageAsSomeoneElse,
	getMessages,
	messageByMessageId,
	messagesBySenderId,
	messagesBySenderToken,
	messageByInvalidMessageId,
	messagesByInvalidSenderId,
	messagesByInvalidSenderToken,
} from './messageTestFunc';
import {
	createChat,
	joinChat,
	joinChatWithWrongToken,
	leaveChat,
	leaveChatWithWrongChatId,
	leaveChatWithWrongToken,
	getChats,
	chatsByUser,
	chatById,
	chatByIdWithWrongId,
	deleteChat,
} from './chatTestFunc';
import {queue, queuePosition, initiateChat, dequeueUser} from './queueTestFunc';
import {checkToken, checkAdmin} from './authTestFunc';

// Connections

beforeAll(async () => {
	await mongoose.connect(process.env.TEST_DATABASE_URL as string);
});

afterAll(async () => {
	await mongoose.connection.close();
});

// FOR TESTS TO WORK MAKE SURE YOU HAVE ADMIN ACCOUNT DEFINED AND CREATED IN DATABASE! ALSO CHATS AND MESSAGES NEED TO EMPYTY BEFORE TESTS!

describe('Testing backend functions', () => {
	// Reg and login before all tests

	// Create random username user incase test fails and we lazy to delete user

	const username = 'testuser' + Math.floor(Math.random() * 1000).toString();
	const username2 = 'testPro' + Math.floor(Math.random() * 1000).toString();
	const newUser: UserTest = {
		username: username,
		email: username + '@testeri.fi',
		password: 'testo' + username,
	};

	const newUserAlt: UserTest = {
		username: username + 'alt',
		email: username + 'alt' + '@testeri.fi',
		password: 'testo' + username + 'alt',
	};

	const newUser2: UserTest = {
		username: username2,
		email: username2 + '@testeri.fi',
		password: 'testo' + username2,
	};

	const userWithExistingUsername: UserTest = {
		username: username,
		email: username + '3' + '@testeri.fi',
		password: 'testo' + username,
	};

	const userWithExistingEmail: UserTest = {
		username: username + '3',
		email: username + '@testeri.fi',
		password: 'testo' + username,
	};

	const delUser: UserTest = {
		username: 'deluser',
		email: 'deluser@testeri.fi',
		password: 'deluser',
	};

	//THIS USER NEED TO PRE-EXIST IN DATABASE AND HAVE ADMIN ROLE!
	const adminUser = {
		username: 'admin',
		email: 'admin@test.fi',
		password: 'admin',
	};
	var adminUserData: LoginMessageResponse;
	var userData: LoginMessageResponse;
	var userData2: LoginMessageResponse;
	var delUserData: LoginMessageResponse;

	// Userdata for tokens etc.

	describe('Testing user reg/login', () => {
		it('should register a user', async () => {
			await registerUser(app, newUser);
			await registerUser(app, newUser2);
			await registerUser(app, delUser);
		});

		it('should not register a user with same username', async () => {
			await registerUserWithExistingCredentials(app, userWithExistingUsername);
		});

		it('should not register a user with same email', async () => {
			await registerUserWithExistingCredentials(app, userWithExistingEmail);
		});

		it('should login a user', async () => {
			// Preserve userdata for later tests (token needed)
			userData = await loginUser(app, newUser);
			userData2 = await loginUser(app, newUser2);
			adminUserData = await loginUser(app, adminUser);
			delUserData = await loginUser(app, delUser);
		});

		it('should not login a user with incorrect credentials', async () => {
			await loginUserWithIncorrectCredentials(app, newUserAlt);
		});
	});

	describe('Testing auth functions', () => {
		it('should check token', async () => {
			await checkToken(app, userData.token as string, userData.user.id);
		});

		it('should check admin', async () => {
			await checkAdmin(app, adminUserData.token as string);
		});
	});

	describe('Testing user functions', () => {
		// User to be used in tests

		it('should delete delUser for future tests', async () => {
			await deleteUser(app, delUserData);
		});

		it('should get users', async () => {
			await getUsers(app, userData);
		});

		it('should get a user by token', async () => {
			await getUserByToken(app, userData.token as string);
		});

		it('should not get a user by incorrect token', async () => {
			await getUserByIncorrectToken(app, delUserData.token as string);
		});

		it('should get a user by id', async () => {
			await getUserById(app, userData.user.id);
		});

		it('should not get a user by incorrect id', async () => {
			await getUserByIncorrectId(app, '123');
		});

		it('should be able to like another user', async () => {
			await likeUser(app, adminUserData.token as string, userData.user.username);
		});

		it('should be able to dislike another user', async () => {
			await dislikeUser(app, adminUserData.token as string, userData.user.username);
		});

		it('should be able to modify a user', async () => {
			await modifyUser(app, userData.token as string, 'testi', 'testi');
		});

		it('should not be able to modify a user with incorrect token', async () => {
			await modifyUserWithIncorrectToken(app, '123', 'testi', 'testi');
		});

		it('should be able to modify a user as admin', async () => {
			await modifyUserAsAdmin(app, adminUserData.token as string, userData.user.id, 'admin');
		});

		it('should not be able to modify a user as admin with incorrect token', async () => {
			await modifyUserAsAdminWithIncorrectToken(app, delUserData.token as string, userData.user.id, 'admin');
		});
	});

	// Tests for queue

	describe('Testing queue functions', () => {
		it('should initiate a chat', async () => {
			await initiateChat(app, userData.token as string);
		});

		it('should show user in queue', async () => {
			await queue(app);
		});

		it('should show users position in queue', async () => {
			await queuePosition(app, userData.token as string);
		});

		it('should dequeue user', async () => {
			await dequeueUser(app, userData.token as string);
		});
	});

	// Tests for chats

	let chat: ChatTest;

	describe('Testing chat functions', () => {
		it('should create a chat', async () => {
			chat = (await createChat(app, userData)) as ChatTest;
		});

		it('should join a chat', async () => {
			await joinChat(app, userData2, chat.id as string);
		});

		it('should not join a chat with invalid token', async () => {
			await joinChatWithWrongToken(app, delUserData, chat.id as string);
		});

		it('should not leave a chat with invalid token', async () => {
			await leaveChatWithWrongToken(app, chat.id as string, delUserData.token as string);
		});

		it('should not leave a chat with invalid chat id', async () => {
			await leaveChatWithWrongChatId(app, '123', userData2.token as string);
		});

		it('should leave a chat', async () => {
			await leaveChat(app, chat.id as string, userData2.token as string);
		});

		it('should get chats', async () => {
			await getChats(app);
		});

		it('should get a chat by id', async () => {
			await chatById(app, chat.id as string);
		});

		it('should not get a chat by invalid id', async () => {
			await chatByIdWithWrongId(app, '123');
		});

		it('should get chats by user', async () => {
			await chatsByUser(app, userData);
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
			await getMessages(app, 10);
		}, 20000);

		it('should delete a message as admin', async () => {
			const length = testMessages.length;
			await deleteMessageAsAdmin(app, adminUserData, testMessages[length - 1].id as string);
			testMessages.pop();
		});

		it('should not delete message as somebody else as sender', async () => {
			const length = testMessages.length;
			await deleteMessageAsSomeoneElse(app, userData2, testMessages[length - 1].id as string);
		});

		it('admin delete should only work for admins', async () => {
			const length = testMessages.length;
			await deleteMessageAsAdminButUser(app, userData2, testMessages[length - 1].id as string);
		});

		it('should delete rest of the messages', async () => {
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

		it('should not delete a user with incorrect token', async () => {
			await deleteUserWithIncorrectToken(app, '123');
		});

		it('should not delete a user as admin without admin token', async () => {
			await deleteUserAsAdminWithOutAdminToken(app, delUserData.token as string, userData2.user.id as string);
		});

		it('should delete a user as admin', async () => {
			await deleteUserAsAdmin(app, adminUserData, userData2.user.id as string);
		});
	});

	describe('Chat can be deleted', () => {
		it('should delete a chat as admin', async () => {
			await deleteChat(app, adminUserData, chat);
		});
	});
});
