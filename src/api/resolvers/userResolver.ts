import {GraphQLError} from 'graphql';
import {Message} from '../../interfaces/Message';
import {User, UserIdWithToken} from '../../interfaces/User';
import dotenv from 'dotenv';
dotenv.config();
import {PubSub} from 'graphql-subscriptions';

const HENRI = 'henri';

const pubsub = new PubSub();
export default {
	/* Message: {
		sender: async (parent: Message) => {
			console.log('oon turha');

			const response = await fetch(`${process.env.AUTH_URL}/users/${parent.sender}`);
			if (!response.ok) {
				throw new GraphQLError(response.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
			}
			const user = await response.json();
			return user;
		},
	}, */
	Subscription: {
		hello: {
			subscribe: () => pubsub.asyncIterator(['asd']),
		},
	},
	Query: {
		users: async (_parent: unknown, args: {token: string}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users`, {
					headers: {
						Authorization: `Bearer ${args.token}`,
					},
				});
				if (!response.ok) {
					throw new GraphQLError('Failed to fetch users', {
						extensions: {code: 'NOT_FOUND'},
					});
				}

				const users = await response.json();

				return users;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		getUserById: async (_parent: unknown, args: {id: string}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users/${args.id}`);
				if (!response.ok) {
					throw new GraphQLError(`User with ID ${args.id} not found`, {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const user = await response.json();
				return user;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		validateToken: async (_parent: unknown, _args: unknown, user: UserIdWithToken) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users/token`, {
					headers: {
						Authorization: `Bearer ${user.token}`,
					},
				});
				if (!response.ok) {
					throw new GraphQLError('Token validation failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const userFromAuth = await response.json();
				return userFromAuth;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
	},
	Mutation: {
		loginUser: async (_parent: unknown, args: {credentials: {email: string; password: string}}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/auth/login`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(args.credentials),
				});
				if (!response.ok) {
					throw new GraphQLError('Login failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const user = await response.json();
				return user;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		registerUser: async (_: unknown, args: {user: User}) => {
			try {
				console.log(`${process.env.AUTH_URL}/users`);
				const response = await fetch(`${process.env.AUTH_URL}/users`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(args.user),
				});
				if (!response.ok) {
					throw new GraphQLError('User registration failed', {
						extensions: {code: 'VALIDATION_ERROR'},
					});
				}
				const user = await response.json();
				const pubUser = {
					id: user.user.id,
					email: user.user.email,
					username: user.user.username,
					password: user.user.password,
				};
				pubsub.publish('asd', {hello: pubUser});
				console.log(pubUser);
				return user;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		deleteUser: async (_parent: unknown, _args: {token: String}) => {
			try {
				if (!_args.token) return null;
				const response = await fetch(`${process.env.AUTH_URL}/users`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${_args.token}`,
					},
				});
				if (!response.ok) {
					throw new GraphQLError('User deletion failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const userFromDelete = await response.json();
				return userFromDelete;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		deleteUserAsAdmin: async (_parent: unknown, args: {user: UserIdWithToken; deleteUserID: String}) => {
			try {
				if (!args.user.token) return null;
				const isUserAdmin = await fetch(`${process.env.AUTH_URL}/users/${args.user.id}`, {
					headers: {
						Authorization: `Bearer ${args.user.token}`,
					},
				});
				const isAdmin = await isUserAdmin.json();
				if (isAdmin.role.toLowerCase() !== 'admin') {
					throw new GraphQLError('User is not an admin', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const res = await fetch(`${process.env.AUTH_URL}/users/${args.deleteUserID}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${args.user.token}`,
						role: isAdmin.role.toLowerCase(), // add role from user object
					},
				});
				if (!res.ok) {
					throw new GraphQLError('User deletion failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const userDeleted = await res.json();
				return userDeleted;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
	},
};
