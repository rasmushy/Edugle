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
			expect(res.body.data.addLike).toBe(1)
				resolve(res.body.data);
			});
	});
}

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
			expect(res.body.data.removeLike).toBe(0)
			resolve(res.body.data.removeLike);
		})
	});
}

export {registerUser, loginUser, deleteUser, getUsers, getUserById, likeUser, dislikeUser};
