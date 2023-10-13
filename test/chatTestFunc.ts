import request from 'supertest';
import {UserTest} from '../src/interfaces/User';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import {ChatTest} from '../src/interfaces/Chat';

const createChat = async (url: string | Function, userData: LoginMessageResponse, userData2: LoginMessageResponse) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
            mutation CreateChat($chat: CreateChatInput) {
                        createChat(chat: $chat) {
                            id
                            created_date
                            users {
                            id
                            username
                            email
                            description
                            avatar
                            lastLogin
                            }
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
                            }
                            }
                        }
                        }

            `,
				variables: {
					chat: {
						users: [userData.user.id, userData2.user.id],
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const chat = res.body.data.createChat;
				expect(chat).toHaveProperty('id');
				expect(chat).toHaveProperty('created_date');
				expect(chat).toHaveProperty('users');
				resolve(chat);
			});
	});
};

const subscriteToChat = async (url: string | Function, chatId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: `
				subscription Subscription($chatId: ID!) {
					messageCreated(chatId: $chatId) {
						id
						created_date
						users {
							id
							username
							email
							description
							avatar
							lastLogin
						}
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
				}
						`,
				variables: {
					chatId: chatId,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				resolve(res.body.data.messageCreated);
			});
	});
};

const deleteChat = async (url: string | Function, adminUserData: LoginMessageResponse, chat: ChatTest) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
							mutation Mutation($chatId: ID!, $userToken: String!) {
								deleteChatAsAdmin(chatId: $chatId, userToken: $userToken) {
									id
									created_date
									users {
										id
										username
										email
										description
										avatar
										lastLogin
									}
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
							}
            `,
				variables: {
					chatId: chat.id,
					userToken: adminUserData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const chat = res.body.data.deleteChatAsAdmin;
				expect(chat).toHaveProperty('id');
				expect(chat).toHaveProperty('created_date');
				expect(chat).toHaveProperty('users');
				resolve(chat);
			});
	});
};

export {createChat, subscriteToChat, deleteChat};
