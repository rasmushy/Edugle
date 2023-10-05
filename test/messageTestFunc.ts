import request from 'supertest';
import {MessageTest} from '../src/interfaces/Message';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import mongoose, {mongo} from 'mongoose';

const createMessage = async (url: string | Function, userData: LoginMessageResponse, testMessage: MessageTest) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
            mutation CreateMessage($message: MessageInput!, $user: UserWithTokenInput!) {
                createMessage(message: $message, user: $user) {
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
					message: testMessage,
					user: {
						id: userData.user.id,
						token: userData.token,
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
				expect(message.content).toBe(testMessage.content);
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
            query MessageById($messageByIdId: ID!) {
                messageById(id: $messageByIdId) {
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
					messageByIdId: messageId,
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

const messageBySender = async (url: string | Function, userId: string) => {
    return new Promise((resolve, reject) => {
        request(url)
            .post('/graphql')
            .set('Content-type', 'application/json')
            .send({
                query: `
                query MsgBySender($messagesBySenderId: ID!) {
                  messagesBySender(id: $messagesBySenderId) {
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
                  messagesBySenderId: userId,
                },
            })
            .expect(200, (err, res) => {
                if (err) {
                    reject(err);
                }
                for (const message of res.body.data.messagesBySender) {
                  expect(message).toHaveProperty('id');
                  expect(message).toHaveProperty('date');
                  expect(message).toHaveProperty('content');
                  expect(message).toHaveProperty('sender');
                }
                resolve(res.body.data.messagesBySender);
            });
    });
}

const deleteMessage = async (url: string | Function, userData: LoginMessageResponse, messageId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
            mutation DeleteMessage($deleteMessageId: ID!, $user: UserWithTokenInput) {
                deleteMessage(id: $deleteMessageId, user: $user) {
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
					deleteMessageId: messageId as unknown as mongoose.Types.ObjectId,
					user: {
						id: userData.user.id as unknown as mongoose.Types.ObjectId,
						token: userData.token,
					},
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

export {createMessage, deleteMessage, messageById, messageBySender};

