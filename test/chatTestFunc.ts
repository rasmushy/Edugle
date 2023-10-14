import request from 'supertest';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import {ChatTest} from '../src/interfaces/Chat';

const createChat = async (url: string | Function, userData: LoginMessageResponse) => {
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
						users: [userData.user.id],
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

const joinChat = async (url: string | Function, userData: LoginMessageResponse, chatId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
			mutation Mutation($chatId: ID!, $userToken: String!) {
				joinChat(chatId: $chatId, userToken: $userToken) {
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
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const chat = res.body.data.joinChat;
				expect(chat).toHaveProperty('id');
				expect(chat).toHaveProperty('created_date');
				expect(chat).toHaveProperty('users');
				expect(chat.users[1]).toHaveProperty('id');
				expect(chat.users[1]).toHaveProperty('username');
				expect(chat.users[1].id.toString()).toBe(userData.user.id);
				resolve(chat);
			});
	});
};

const joinChatWithWrongToken = async (url: string | Function, userData: LoginMessageResponse, chatId: string) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
			mutation Mutation($chatId: ID!, $userToken: String!) {
				joinChat(chatId: $chatId, userToken: $userToken) {
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
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const chat = res.body.data.joinChat;
				expect(chat).toBeNull();
				expect(res.body.errors[0].message).toBe('User not found');
				resolve(chat);
			});
	});
};

const getChats = async (url: string | Function) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
						query {
												chats {
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
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const chats = res.body.data.chats;
				expect(chats).toBeInstanceOf(Array);
				expect(chats[0]).toHaveProperty('id');
				expect(chats[0]).toHaveProperty('created_date');
				expect(chats[0]).toHaveProperty('users');
				expect(chats[0]).toHaveProperty('messages');
				resolve(chats);
			});
	});
};

const chatsByUser = async (url: string | Function, userData: LoginMessageResponse) => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
					query Query($userToken: String!) {
						chatsByUser(userToken: $userToken) {
							created_date
							id
							messages {
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
							users {
								avatar
								description
								email
								id
								lastLogin
								username
							}
						}
					}
						`,
				variables: {
					userToken: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				const chats = res.body.data.chatsByUser;
				expect(chats).toBeInstanceOf(Array);
				expect(chats[0]).toHaveProperty('id');
				expect(chats[0]).toHaveProperty('created_date');
				expect(chats[0]).toHaveProperty('users');
				expect(chats[0].users[0]).toHaveProperty('id');
				expect(chats[0].users[0]).toHaveProperty('username');
				expect(chats[0].users[0].id.toString()).toBe(userData.user.id);
				resolve(chats);
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

export {createChat, joinChat, joinChatWithWrongToken, getChats, chatsByUser, subscriteToChat, deleteChat};
