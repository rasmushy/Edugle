import request from 'supertest';
import {MessageTest} from '../src/interfaces/Message';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import mongoose, {mongo} from 'mongoose';

const createMessageQuery = () => `
	mutation CreateMessage($message: MessageInput!, $chatId: ID!) {
		createMessage(message: $message, chatId: $chatId) {
			id
			date
			content
			sender {
				id
				username
				email
				password
				description
				avatar
				lastLogin
				role
			}
		}
	}
`;

const createMessage = async (url: string | Function, userData: LoginMessageResponse, chatId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: createMessageQuery(),
				variables: {
					chatId: chatId,
					message: {
						content: 'test message',
						senderToken: userData.token,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const message = res.body.data.createMessage;
				expect(message).toHaveProperty('id');
				expect(message).toHaveProperty('date');
				expect(message).toHaveProperty('content');
				expect(message).toHaveProperty('sender');
				expect(message.content).toBe('test message');
				expect(message.sender.id).toBe(userData.user.id);
				resolve(message);
			});
	});
};

const createMessageWithInvalidToken = async (url: string | Function, chatId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: createMessageQuery(),
				variables: {
					chatId: chatId,
					message: {
						content: 'if you see me then something went wrong with create message with invalid token test',
						senderToken: '123',
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.createMessage).toBe(null);
				expect(res.body.errors[0].message).toBe('Token conversion failed');
				resolve(res.body.data.createMessage);
			});
	});
};

const createMessageWithInvalidChatId = async (url: string | Function, userData: LoginMessageResponse): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: createMessageQuery(),
				variables: {
					chatId: '123',
					message: {
						content: 'if you see me then something went wrong with invalid chat id test',
						senderToken: userData.token,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.createMessage).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body.data.createMessage);
			});
	});
};

const getMessages = async (url: string | Function, amount: number): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
							query Messages {
								messages {
									id
									date
									content
									sender {
										id
										username
										email
										password
										description
										avatar
										lastLogin
										role
										likes
									}
								}
							}
						`,
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messages.length).toEqual(amount);
				for (const message of res.body.data.messages) {
					expect(message).toHaveProperty('id');
					expect(message).toHaveProperty('date');
					expect(message).toHaveProperty('content');
					expect(message).toHaveProperty('sender');
				}
				resolve(res.body.data.messages);
			});
	});
};

const messageByIdQuery = () => `
	query Query($messageId: ID!) {
		messageById(messageId: $messageId) {
			content
			date
			id
			sender {
				avatar
				description
				email
				id
				lastLogin
				likes
				password
				role
				username
			}
		}
	}
`;

const messageByMessageId = async (url: string | Function, messageId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageByIdQuery(),
				variables: {
					messageId: messageId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const message = res.body.data.messageById;
				expect(message).toHaveProperty('id');
				expect(message).toHaveProperty('date');
				expect(message).toHaveProperty('content');
				expect(message).toHaveProperty('sender');
				expect(message.content).toEqual('test message');
				resolve(message);
			});
	});
};

const messageByInvalidMessageId = async (url: string | Function, messageId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageByIdQuery(),
				variables: {
					messageId: messageId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messageById).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body.data.messageById);
			});
	});
};

const messageBySenderIdQuery = () => `
	query Query($userId: ID!) {
		messagesBySenderId(userId: $userId) {
			content
			date
			id
			sender {
				avatar
				description
				email
				id
				lastLogin
				likes
				password
				role
				username
			}
		}
	}
`;

const messagesBySenderId = async (url: string | Function, userId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageBySenderIdQuery(),
				variables: {
					userId: userId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				for (const message of res.body.data.messagesBySenderId) {
					expect(message).toHaveProperty('id');
					expect(message).toHaveProperty('date');
					expect(message).toHaveProperty('content');
					expect(message).toHaveProperty('sender');
					expect(message.sender.id).toBe(userId);
				}
				resolve(res.body.data.messagesBySender);
			});
	});
};

const messagesByInvalidSenderId = async (url: string | Function, userId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageBySenderIdQuery(),
				variables: {
					userId: userId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messagesBySenderId).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body.data.messagesBySender);
			});
	});
};

const messageBySenderTokenQuery = () => `
	query Query($userToken: String!) {
		messagesBySenderToken(userToken: $userToken) {
			content
			date
			id
			sender {
				avatar
				description
				email
				id
				lastLogin
				likes
				password
				role
				username
			}
		}
	}
`;

const messagesBySenderToken = async (url: string | Function, userToken: string, userId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageBySenderTokenQuery(),
				variables: {
					userToken: userToken,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				for (const message of res.body.data.messagesBySenderToken) {
					expect(message).toHaveProperty('id');
					expect(message).toHaveProperty('date');
					expect(message).toHaveProperty('content');
					expect(message).toHaveProperty('sender');
					expect(message.sender.id).toBe(userId);
				}
				resolve(res.body.data.messagesBySender);
			});
	});
};

const messagesByInvalidSenderToken = async (url: string | Function, userToken: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageBySenderTokenQuery(),
				variables: {
					userToken: userToken,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messagesBySenderToken).toBe(null);
				expect(res.body.errors[0].message).toBe('Token conversion failed');
				resolve(res.body.data.messagesBySender);
			});
	});
};

const deleteMessageQuery = () => `
	mutation Mutation($messageId: ID!, $userToken: String!) {
		deleteMessage(messageId: $messageId, userToken: $userToken) {
			content
			date
			id
			sender {
				avatar
				description
				email
				id
				lastLogin
				likes
				password
				role
				username
			}
		}
	}
`;

const deleteMessage = async (url: string | Function, userData: LoginMessageResponse, messageId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: deleteMessageQuery(),
				variables: {
					messageId: messageId as unknown as mongoose.Types.ObjectId,
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const message = res.body.data.deleteMessage;
				expect(message).toHaveProperty('id');
				expect(message.id).toBe(messageId);
				expect(message).toHaveProperty('date');
				expect(message).toHaveProperty('content');
				expect(message).toHaveProperty('sender');
				expect(message.sender.id).toBe(userData.user.id);
				resolve(message);
			});
	});
};

const deleteMessageAsSomeoneElse = async (url: string | Function, userData: LoginMessageResponse, messageId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: deleteMessageQuery(),
				variables: {
					messageId: messageId as unknown as mongoose.Types.ObjectId,
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.deleteMessage).toBe(null);
				expect(res.body.errors[0].message).toBe('Not authorized!');
				resolve(res.body.data.deleteMessage);
			});
	});
};

const deleteMessageAsAdminQuery = () => `
	mutation Mutation($messageId: ID!, $userToken: String!) {
		deleteMessageAsAdmin(messageId: $messageId, userToken: $userToken) {
			id
			date
			content
			sender {
				id
				username
				email
				password
				description
				avatar
				lastLogin
				role
				likes
			}
		}
	}
`;

const deleteMessageAsAdmin = async (url: string | Function, userData: LoginMessageResponse, messageId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.set('Authorization', `Bearer ${userData.token}`)
			.send({
				query: deleteMessageAsAdminQuery(),
				variables: {
					messageId: messageId as unknown as mongoose.Types.ObjectId,
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const message = res.body.data.deleteMessageAsAdmin;
				expect(message).toHaveProperty('id');
				expect(message.id).toBe(messageId);
				expect(message).toHaveProperty('date');
				expect(message).toHaveProperty('content');
				expect(message).toHaveProperty('sender');
				resolve(message);
			});
	});
};

const deleteMessageAsAdminButUser = async (url: string | Function, userData: LoginMessageResponse, messageId: string): Promise<MessageTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.set('Authorization', `Bearer ${userData.token}`)
			.send({
				query: deleteMessageAsAdminQuery(),
				variables: {
					messageId: messageId as unknown as mongoose.Types.ObjectId,
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.errors[0].message).toBe('Not authorized!');
				resolve(res.body.data.deleteMessage);
			});
	});
};

const deletedUsersMessageByMessageId = async (url: string | Function, messageId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: messageByIdQuery(),
				variables: {
					messageId: messageId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const message = res.body.data.messageById;
				expect(message).toHaveProperty('id');
				expect(message).toHaveProperty('date');
				expect(message).toHaveProperty('content');
				expect(message).toHaveProperty('sender');
				expect(message.content).toEqual('test message');
				expect(message.sender.username).toBe('DELETED');
				expect(message.sender.email).toBe('DELETED');
				expect(message.sender.likes).toBe(404);
				resolve(message);
			});
	});
};

const createManyMessages = async (url: string | Function, userData: LoginMessageResponse, chatId: string, amount: number): Promise<MessageTest[]> => {
	const messages: Array<MessageTest> = [];
	for (let i = 0; i < amount; i++) {
		messages.push((await createMessage(url, userData, chatId)) as MessageTest);
	}
	return messages;
};

const deleteManyMessages = async (url: string | Function, userData: LoginMessageResponse, messages: Array<string>) => {
	for (const message of messages) {
		await deleteMessage(url, userData, message);
	}
};

export {
	createMessage,
	createManyMessages,
	createMessageWithInvalidChatId,
	createMessageWithInvalidToken,
	deleteMessage,
	deleteManyMessages,
	deleteMessageAsAdmin,
	deleteMessageAsAdminButUser,
	deleteMessageAsSomeoneElse,
	deletedUsersMessageByMessageId,
	getMessages,
	messageByMessageId,
	messageByInvalidMessageId,
	messagesBySenderId,
	messagesByInvalidSenderId,
	messagesBySenderToken,
	messagesByInvalidSenderToken,
};
