import {GraphQLError} from 'graphql';
import {ModifyUser, User, UserIdWithToken} from '../../interfaces/User';
import dotenv from 'dotenv';
import authUser from '../../utils/auth';
import userModel from '../models/userModel';
import { JsonWebTokenError } from 'jsonwebtoken';
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
		getUserByToken: async (_parent: unknown, args: {token: string}) => {
			try {
				const userId = authUser(args.token);
				const response = await fetch(`${process.env.AUTH_URL}/users/${userId}`);
				if (!response.ok) {
					throw new GraphQLError(`User with ID ${userId} not found`, {
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
				const userId = authUser(args.user.token);
				const isUserAdmin = await fetch(`${process.env.AUTH_URL}/users/${userId}`, {
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
		addLike: async (_parent: unknown, args: {token: string; username: string}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users/token`, {
					headers: {
						Authorization: `Bearer ${args.token}`,
					},
				});
				if (!response.ok) {
					throw new JsonWebTokenError('Token validation failed');
				}
				
				const authUser = await response.json();
				if (authUser.user.username === args.username) {
					throw new Error("Liking yourself is not allowed");
				}
				// Add like to given username
				const user = await userModel.findOneAndUpdate({username: args.username as string}, {$inc: {likes: 1}});
				if (!user) {
					throw new Error('Failed to add like');
				}
				return user.likes + 1;
			} catch (error) {
				if (error instanceof Error) {
					return error;
				}
				throw new Error('An error occurred.');
			}
		},
		removeLike: async (_parent: unknown, args: {token: string; username: string}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users/token`, {
					headers: {
						Authorization: `Bearer ${args.token}`,
					},
				});
				if (!response.ok) {
					throw new JsonWebTokenError('Token validation failed');
				}
				
				const authUser = await response.json();
				if (authUser.user.username === args.username) {
					throw new Error("Why would you unlike yourself?");
				}
				const user = await userModel.findOneAndUpdate({username: args.username as string}, {$dec: {likes: 1}});
				if (!user) {
					throw new Error('Failed to add like');
				}
				return user.likes - 1;
			} catch (error) {
				if (error instanceof Error) {
					return error;
				}
				throw new Error('An error occurred.');
			}
		},
		modifyUser: async (_parent: unknown, args: {modifyUser: UserIdWithToken}) => {
			try {
				if (!args.modifyUser.token) return null;
				const userId = authUser(args.modifyUser.token);
				if (!userId) {
					throw new GraphQLError('Not authorized', {
						extensions: {code: 'NOT_AUTHORIZED'},
					});
				}
				args.modifyUser.id = userId;
				const res = await fetch(`${process.env.AUTH_URL}/users/`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${args.modifyUser.token}`,
					},
					body: JSON.stringify(args.modifyUser),
				});
				if (!res.ok) {
					throw new GraphQLError('User modification failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const userModified = await res.json();
				return userModified;
			} catch (error) {
				console.log(error);
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		modifyUserAsAdmin: async (_parent: unknown, args: {user: UserIdWithToken; modifyUser: ModifyUser}) => {
			try {
				if (!args.user.token) return null;
				const userId = authUser(args.user.token);
				const isUserAdmin = await fetch(`${process.env.AUTH_URL}/users/${userId}`, {
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
				const res = await fetch(`${process.env.AUTH_URL}/users/${args.modifyUser.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${args.user.token}`,
						role: isAdmin.role.toLowerCase(), // add role from user object
					},
					body: JSON.stringify(args.modifyUser),
				});
				if (!res.ok) {
					throw new GraphQLError('User modification failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}
				const userModified = await res.json();
				return userModified;
			} catch (error) {
				console.log(error);
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
	},
};
