import {GraphQLError} from 'graphql';
// eslint-disable-next-line node/no-unpublished-import
import request from 'supertest';
import {UserTest} from '../src/interfaces/User';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import DBMessageResponse from '../src/interfaces/DBMessageResponse';

const registerUser = (url: string | Function, user: UserTest): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation regUser($user: RegisterInput!) {
						registerUser(user: $user) {
							user {
								username
								email
								password
							}
						}
					}`,
				variables: {
					user: {
						username: user.username,
						email: user.email,
						password: user.password,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.registerUser.user.username).toBe(user.username);
				expect(res.body.data.registerUser.user.email).toBe(user.email);
				resolve(res.body.data.registerUser.user);
			});
	});
};

const registerUserWithExistingCredentials = (url: string | Function, user: UserTest): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation regUser($user: RegisterInput!) {
						registerUser(user: $user) {
							user {
								username
								email
								password
							}
						}
					}`,
				variables: {
					user: {
						username: user.username,
						email: user.email,
						password: user.password,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.registerUser).toBe(null);
				expect(res.body.errors[0].message).toBe('User registration failed');
				resolve(res.body.data.registerUser);
			});
	});
};

const getUsers = (url: string | Function, userdata: LoginMessageResponse): Promise<UserTest[]> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
				query Users($token: String!) {
					users(token: $token) {
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
				`,
				variables: {
					token: userdata.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				for (const user of res.body.data.users) {
					expect(user).toHaveProperty('username');
					expect(user).toHaveProperty('email');
				}
				resolve(res.body);
			});
	});
};

const getUserById = (url: string | Function, id: String): Promise<UserTest[]> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
				query GetUserById($getUserByIdId: ID!) {
					getUserById(id: $getUserByIdId) {
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
				`,
				variables: {
					getUserByIdId: id,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.getUserById).toHaveProperty('username');
				expect(res.body.data.getUserById).toHaveProperty('email');
				expect(res.body.data.getUserById).toHaveProperty('id');
				resolve(res.body);
			});
	});
};

const getUserByIncorrectId = (url: string | Function, id: String): Promise<UserTest[]> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
				query GetUserById($getUserByIdId: ID!) {
					getUserById(id: $getUserByIdId) {
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
				`,
				variables: {
					getUserByIdId: id,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.getUserById).toBe(null);
				expect(res.body.errors[0].message).toBe('User not found');
				resolve(res.body);
			});
	});
};

const loginUser = (url: string | Function, user: UserTest): Promise<LoginMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation LoginUser($credentials: LoginInput!) {
							loginUser(credentials: $credentials) {
								user {
									username
									email
									password
									id
								}
								token
								message
							}
						}`,
				variables: {
					credentials: {
						email: user.email,
						password: user.password,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.loginUser.message).toBe('Login successful');
				expect(res.body.data.loginUser.user.username).toBe(user.username);
				expect(res.body.data.loginUser.user.email).toBe(user.email);
				expect(res.body.data.loginUser.user).toHaveProperty('id');
				expect(res.body.data.loginUser.token).toBeTruthy();
				resolve(res.body.data.loginUser);
			});
	});
};

const loginUserWithIncorrectCredentials = (url: string | Function, user: UserTest): Promise<LoginMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation LoginUser($credentials: LoginInput!) {
							loginUser(credentials: $credentials) {
								user {
									username
									email
									password
									id
								}
								token
								message
							}
						}`,
				variables: {
					credentials: {
						email: user.email,
						password: user.password,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.loginUser).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body.data.loginUser);
			});
	});
};

const deleteUser = (url: string | Function, userData: LoginMessageResponse): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation DelUser($token: String) {
							deleteUser(token: $token) {
								token
								message
								user {
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
							}`,
				variables: {
					token: userData.token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.deleteUser.message).toBe('User deleted');
				expect(res.body.data.deleteUser.user.username).toBe(userData.user.username);
				expect(res.body.data.deleteUser.user.email).toBe(userData.user.email);
				resolve(res.body);
			});
	});
};

const deleteUserWithIncorrectToken = (url: string | Function, token: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation DelUser($token: String) {
							deleteUser(token: $token) {
								token
								message
								user {
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
							}`,
				variables: {
					token: token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.deleteUser).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body);
			});
	});
};

const deleteUserAsAdmin = (url: string | Function, adminData: LoginMessageResponse, deleteUserID: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.set('Authorization', `Bearer ${adminData.token}`)
			.send({
				query: `
								mutation Mutation($adminToken: String!, $userToBeDeletedId: ID!) {
									deleteUserAsAdmin(adminToken: $adminToken, userToBeDeletedId: $userToBeDeletedId) {
										token
										message
										user {
											id
											username
											password
										}
									}
								}
							`,
				variables: {
					adminToken: adminData.token,
					userToBeDeletedId: deleteUserID,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}

				expect(res.body.data.deleteUserAsAdmin.message).toBe('User deleted');
				expect(res.body.data.deleteUserAsAdmin).toHaveProperty('user');
				expect(res.body.data.deleteUserAsAdmin.user).toHaveProperty('id');
				expect(res.body.data.deleteUserAsAdmin.user).toHaveProperty('username');
				resolve(res.body);
			});
	});
};

const deleteUserAsAdminWithOutAdminToken = (url: string | Function, adminData: LoginMessageResponse, deleteUserID: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.set('Authorization', `Bearer ${adminData.token}`)
			.send({
				query: `
								mutation Mutation($adminToken: String!, $userToBeDeletedId: ID!) {
									deleteUserAsAdmin(adminToken: $adminToken, userToBeDeletedId: $userToBeDeletedId) {
										token
										message
										user {
											id
											username
											password
										}
									}
								}
							`,
				variables: {
					adminToken: adminData.token,
					userToBeDeletedId: deleteUserID,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}

				expect(res.body.data.deleteUserAsAdmin).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body);
			});
	});
};

const likeUser = (url: string | Function, token: string, username: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation LikeUser($username: String!, $token: String) {
						addLike(username: $username, token: $token)
						}`,
				variables: {
					token: token,
					username: username,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.addLike).toBe(1);
				resolve(res.body.data);
			});
	});
};

const dislikeUser = (url: string | Function, token: string, username: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation DislikeUser($username: String!, $token: String) {
					removeLike(username: $username, token: $token)
					}`,
				variables: {
					token: token,
					username: username,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.removeLike).toBe(0);
				resolve(res.body.data.removeLike);
			});
	});
};

const modifyUser = (url: string | Function, userToken: string, newDesc: string, newAvatar: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
							mutation Mutation($modifyUser: modifyUserInput) {
								modifyUser(modifyUser: $modifyUser) {
									token
									message
									user {
										id
										username
									}
								}
							}
				`,
				variables: {
					modifyUser: {
						token: userToken,
						description: newDesc,
						avatar: newAvatar,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.modifyUser.message).toBe('User updated');
				expect(res.body.data.modifyUser.user).toHaveProperty('id');
				expect(res.body.data.modifyUser.user).toHaveProperty('username');
				resolve(res.body.data.modifyUser);
			});
	});
};

const modifyUserWithIncorrectToken = (url: string | Function, userToken: string, newDesc: string, newAvatar: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
							mutation Mutation($modifyUser: modifyUserInput) {
								modifyUser(modifyUser: $modifyUser) {
									token
									message
									user {
										id
										username
									}
								}
							}
				`,
				variables: {
					modifyUser: {
						token: userToken,
						description: newDesc,
						avatar: newAvatar,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.modifyUser).toBe(null);
				expect(res.body.errors[0].message).toBe('Not authorized');
				resolve(res.body.data.modifyUser);
			});
	});
};

const modifyUserAsAdmin = (url: string | Function, adminToken: string, userId: string, newRole: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Authorization', `Bearer ${adminToken}`)
			.set('Content-type', 'application/json')
			.send({
				query: `
				mutation Mutation($user: modifyUserAsAdminInput, $modifyUser: ModifyUserWithTokenAndRoleInput) {
					modifyUserAsAdmin(user: $user, modifyUser: $modifyUser) {
						token
						message
						user {
							id
							username
							description
							avatar
						}
					}
				}
				`,
				variables: {
					modifyUser: {
						id: userId,
						role: newRole,
					},
					user: {
						token: adminToken,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.modifyUserAsAdmin.message).toBe('User updated');
				expect(res.body.data.modifyUserAsAdmin.user).toHaveProperty('id');
				expect(res.body.data.modifyUserAsAdmin.user).toHaveProperty('username');
				resolve(res.body.data.modifyUserAsAdmin);
			});
	});
};

const modifyUserAsAdminWithIncorrectToken = (url: string | Function, adminToken: string, userId: string, newRole: string): Promise<DBMessageResponse> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Authorization', `Bearer ${adminToken}`)
			.set('Content-type', 'application/json')
			.send({
				query: `
				mutation Mutation($user: modifyUserAsAdminInput, $modifyUser: ModifyUserWithTokenAndRoleInput) {
					modifyUserAsAdmin(user: $user, modifyUser: $modifyUser) {
						token
						message
						user {
							id
							username
							description
							avatar
						}
					}
				}
				`,
				variables: {
					modifyUser: {
						id: userId,
						role: newRole,
					},
					user: {
						token: adminToken,
					},
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.modifyUserAsAdmin).toBe(null);
				expect(res.body.errors[0].message).toBe('Not Authorised!');
				resolve(res.body.data.modifyUserAsAdmin);
			});
	});
};

export {
	registerUser,
	registerUserWithExistingCredentials,
	loginUser,
	loginUserWithIncorrectCredentials,
	deleteUser,
	deleteUserWithIncorrectToken,
	deleteUserAsAdmin,
	deleteUserAsAdminWithOutAdminToken,
	getUsers,
	getUserByIncorrectId,
	getUserById,
	likeUser,
	dislikeUser,
	modifyUser,
	modifyUserWithIncorrectToken,
	modifyUserAsAdmin,
	modifyUserAsAdminWithIncorrectToken,
};
