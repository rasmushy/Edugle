import request from 'supertest';
import {MessageTest} from '../src/interfaces/Message';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import mongoose, {mongo} from 'mongoose';
import {ChatTest} from '../src/interfaces/Chat';

const createMessage = async (url: string | Function, userData: LoginMessageResponse, chatId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
            `,
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

const createMessageWithInvalidToken = async (url: string | Function, chatId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
							`,
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
				expect(res.body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
				resolve(res.body.data.createMessage);
			});
	});
};

const createMessageWithInvalidChatId = async (url: string | Function, userData: LoginMessageResponse) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
            `,
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
				expect(res.body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
				resolve(res.body.data.createMessage);
			});
	});
};

const getMessages = async (url: string | Function) => {
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
				expect(res.body.data.messages.length).toEqual(10);
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

const messageByMessageId = async (url: string | Function, messageId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
            `,
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

const messageByInvalidMessageId = async (url: string | Function, messageId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
						`,
				variables: {
					messageId: messageId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messageById).toBe(null);
				resolve(res.body.data.messageById);
			});
	});
};

const messagesBySenderId = async (url: string | Function, userId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
            `,
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

const messagesByInvalidSenderId = async (url: string | Function, userId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
						`,
				variables: {
					userId: userId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messagesBySenderId).toBe(null);
				resolve(res.body.data.messagesBySender);
			});
	});
};

const messagesBySenderToken = async (url: string | Function, userToken: string, userId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
						`,
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

const messagesByInvalidSenderToken = async (url: string | Function, userToken: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
						`,
				variables: {
					userToken: userToken,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.messagesBySenderToken).toBe(null);
				resolve(res.body.data.messagesBySender);
			});
	});
};

const deleteMessage = async (url: string | Function, userData: LoginMessageResponse, messageId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
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
            `,
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

const createManyMessages = async (url: string | Function, userData: LoginMessageResponse, chatId: string, amount: number) => {
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
	getMessages,
	messageByMessageId,
	messageByInvalidMessageId,
	messagesBySenderId,
	messagesByInvalidSenderId,
	messagesBySenderToken,
	messagesByInvalidSenderToken,
};
