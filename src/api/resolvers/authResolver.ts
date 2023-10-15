import {GraphQLError} from 'graphql';
import dotenv from 'dotenv';
dotenv.config();

export default {
	Query: {
		checkToken: async (_parent: unknown, args: {token: string}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users/token`, {
					headers: {
						Authorization: `Bearer ${args.token}`,
					},
				});

				if (!response.ok) {
					throw new GraphQLError('Token validation failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}

				const data = await response.json();

				if (!data) {
					throw new GraphQLError('Something went wrong', {
						extensions: {code: 'UNAUTHORIZED'},
					});
				}
				return data.user;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
		checkAdmin: async (_parent: unknown, args: {token: string}) => {
			try {
				const response = await fetch(`${process.env.AUTH_URL}/users/auth`, {
					headers: {
						Authorization: `Bearer ${args.token}`,
					},
				});
				if (!response.ok) {
					throw new GraphQLError('Token validation failed', {
						extensions: {code: 'NOT_FOUND'},
					});
				}

				const data = await response.json();

				if (!data) {
					throw new GraphQLError('User is not an admin', {
						extensions: {code: 'UNAUTHORIZED'},
					});
				}

				return data.user;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('An unknown error occurred.');
			}
		},
	},
};
