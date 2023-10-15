// eslint-disable-next-line node/no-unpublished-import
import request from 'supertest';
import {UserTest} from '../src/interfaces/User';

const queueQuery = () => `
query Queue {
  queue {
    id
    joinedAt
    position
    userId {
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

const queue = (url: string | Function): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: queueQuery(),
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.queue).toHaveLength(1);
				console.log('tärkee', res.body.data.queue);
				resolve(res.body);
			});
	});
};

const queuePositionQuery = () => `
query Query($token: String!) {
  queuePosition(token: $token) {
    position
    status
  }
}
`;

const queuePosition = (url: string | Function, userToken: string): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: queuePositionQuery(),
				variables: {
					token: userToken,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.queuePosition.position).toBe(1);
				resolve(res.body);
			});
	});
};

const initiateChatQuery = () => `
mutation Mutation($token: String!) {
  initiateChat(token: $token) {
    ... on PairedChatResponse {
      chatId
      status
    }
    ... on QueuePositionResponse {
      position
      status
    }
  }
}
`;

const initiateChat = (url: string | Function, userToken: string): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: initiateChatQuery(),
				variables: {
					token: userToken,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.initiateChat.status).toBe('Queue');
				resolve(res.body);
			});
	});
};

const dequeueUserQuery = () => `
mutation Mutation($token: String!) {
  dequeueUser(token: $token) {
    position
    status
  }
}
`;

const dequeueUser = (url: string | Function, userToken: string): Promise<UserTest> => {
	return new Promise((resolve, reject) => {
		request(url)
			.post('/graphql')
			.set('Content-Type', 'application/json')
			.send({
				query: dequeueUserQuery(),
				variables: {
					token: userToken,
				},
			})
			.expect(200, (err, res) => {
				if (err) {
					reject(err);
				}
				expect(res.body.data.dequeueUser.status).toBe('User left from queue');
				resolve(res.body);
			});
	});
};

export {queue, queuePosition, initiateChat, dequeueUser};