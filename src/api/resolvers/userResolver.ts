import {GraphQLError} from 'graphql';
import {ModifyUser, User, UserIdWithToken} from '../../interfaces/User';
import authUser from '../../utils/auth';
import userModel from '../models/userModel';
import {JsonWebTokenError} from 'jsonwebtoken';
import {PubSub} from 'graphql-subscriptions';
const pubsub = new PubSub();

export default {
	Query: {
		users: async (_parent: unknown, args: {token: string}) => {
			try {
				const userId = convertToken(args.token);
				if (userId instanceof Error || !userId) {
					return Error('Not authorized');
				}
				const user = await userModel.findOne({_id: userId}, {password: 0});
				if (!user) {
					return Error('User not found');
				}
				if (user.role.toLowerCase() !== 'admin') {
					return Error('Not authorized. You are not an admin');
				}
				const response = await fetch(`${process.env.AUTH_URL}/users`, {
					headers: {
						Authorization: `Bearer ${args.token}`,
					},
				});
				if (!response.ok) {
					return Error('Failed to fetch users');
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
					return Error(`User not found`);
				}

				const user = await response.json();
				pubsub.publish('USER_CREATED', {userSub: user});
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
					return Error(`User not found`);
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
					return Error('User registration failed');
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
		deleteUser: async (_parent: unknown, args: {token: String}) => {
			try {
				if (!args.token) {
					return Error('No token');
				}
				const response = await fetch(`${process.env.AUTH_URL}/users`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${args.token}`,
					},
				});
				if (!response.ok) {
					return Error('User deletion failed');
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
		deleteUserAsAdmin: async (_parent: unknown, args: {adminToken: string; userToBeDeletedId: string}) => {
			try {
				const userId = convertToken(args.adminToken);
				if (userId instanceof Error) {
					return userId;
				}
				const isUserAdmin = await fetch(`${process.env.AUTH_URL}/users/${userId}`, {
					headers: {
						Authorization: `Bearer ${args.adminToken}`,
					},
				});
				const isAdmin = await isUserAdmin.json();
				if (!isAdmin || isAdmin.role.toLowerCase() !== 'admin') {
					return Error('User is not an admin');
				}
				const res = await fetch(`${process.env.AUTH_URL}/users/${args.userToBeDeletedId}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${args.adminToken}`,
						role: isAdmin.role.toLowerCase(), // add role from user object
					},
				});
				if (!res.ok) {
					return Error('User deletion failed');
				}
				return await res.json();
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
					throw new Error('Liking yourself is not allowed');
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
					throw new Error('Why would you unlike yourself?');
				}
				const user = await userModel.findOneAndUpdate({username: args.username as string}, {$inc: {likes: -1}});
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
				const userId = convertToken(args.modifyUser.token);
				if (userId instanceof Error) {
					return Error('Not authorized');
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
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		modifyUserAsAdmin: async (_parent: unknown, args: {user: UserIdWithToken; modifyUser: ModifyUser}) => {
			try {
				const userId = convertToken(args.user.token);
				if (userId instanceof Error) {
					return Error('Not authorized');
				}
				const isUserAdmin = await fetch(`${process.env.AUTH_URL}/users/${userId}`, {
					headers: {
						Authorization: `Bearer ${args.user.token}`,
					},
				});
				const isAdmin = await isUserAdmin.json();
				if (isAdmin.role.toLowerCase() !== 'admin') {
					return Error('User is not an admin');
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
					return Error('User modification failed');
				}
				const userModified = await res.json();
				return userModified;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
	},
};

const convertToken = (userToken: string) => {
	if (!userToken) {
		return Error('No token');
	}
	const userId = authUser(userToken);
	if (!userId) {
		return Error('Token conversion failed');
	}
	return userId;
};
