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

const messageById = async (url: string | Function, messageId: string) => {
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
				resolve(message);
			});
	});
};

const messageBySenderId = async (url: string | Function, userId: string) => {
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
				}
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

export {createMessage, deleteMessage, messageById, messageBySenderId};
