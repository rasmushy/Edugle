import request from 'supertest';
import {UserTest} from '../src/interfaces/User';
import exp from 'constants';

const checkTokenQuery = `
query CheckToken($token: String!) {
  checkToken(token: $token) {
    email
    id
    role
    username
  }
}`;

const checkToken = (url: string | Function, token: string, userId: string): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: checkTokenQuery,
				variables: {
					token: token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.checkToken).toHaveProperty('username');
				expect(res.body.data.checkToken).toHaveProperty('email');
				expect(res.body.data.checkToken).toHaveProperty('id');
				expect(res.body.data.checkToken).toHaveProperty('role');
				expect(res.body.data.checkToken.id).toEqual(userId);
				resolve(res.body.data.checkToken);
			});
	});
};

const checkAdminQuery = `
query CheckAdmin($token: String!) {
  checkAdmin(token: $token) {
    email
    id
    role
    username
  }
}
`;

const checkAdmin = (url: string | Function, token: string): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: checkAdminQuery,
				variables: {
					token: token,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.checkAdmin).toHaveProperty('username');
				expect(res.body.data.checkAdmin).toHaveProperty('email');
				expect(res.body.data.checkAdmin).toHaveProperty('id');
				expect(res.body.data.checkAdmin).toHaveProperty('role');
				expect(res.body.data.checkAdmin.role).toContain('admin');
				resolve(res.body.data.checkAdmin);
			});
	});
};

export {checkToken, checkAdmin};
