import {GraphQLError} from 'graphql';
import {User, UserIdWithToken} from '../../interfaces/User';
import dotenv from 'dotenv';
dotenv.config();

export default {
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
		loginUser: async (_parent: unknown, args: {credentials: {username: string; password: string}}) => {
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
				const user: User = await response.json();
				return user;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		deleteUser: async (_parent: unknown, _args: unknown, user: UserIdWithToken) => {
			try {
				if (!user.token) return null;
				const response = await fetch(`${process.env.AUTH_URL}/users`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${user.token}`,
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
		deleteUserAsAdmin: async (_parent: unknown, args: User, user: UserIdWithToken) => {
			try {
				if (!user.token || !user.role.includes('admin')) return null;
				const res = await fetch(`${process.env.AUTH_URL}/users/${args.id}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${user.token}`,
						role: user.role, // add role from user object
					},
				});
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
