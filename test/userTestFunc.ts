// eslint-disable-next-line node/no-unpublished-import
import request from 'supertest';
import {UserTest} from '../src/interfaces/User';

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
				console.log('res.body.data', res.body.data.registerUser.user);
				resolve(res.body.data.registerUser.user);
			});
	});
};

const getUser = (url: string | Function): Promise<UserTest[]> => {
	return new Promise((resolve, reject) => {
		request(url)
			.get('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `
				`,
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				resolve(res.body);
			});
	});
};

const loginUser = (url: string | Function, user: UserTest): Promise<UserTest> => {
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
				resolve(res.body.data.loginUser.user);
			});
	});
};
const deleteUser = (url: string | Function, user: UserTest): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-type', 'application/json')
			.send({
				query: `mutation deleteUser {
						deleteUser {
							user {
								id
							}
							token
						}
					}`,
				variables: {
					id: user.id,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				resolve(res.body.data.deleteUser.user);
			});
	});
};

export {registerUser, loginUser, deleteUser, getUser};
