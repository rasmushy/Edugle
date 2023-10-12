import {Request} from 'express';
import jwt from 'jsonwebtoken';
import {IUserIdWithToken} from '../interfaces/IUser';
import {GraphQLError} from 'graphql';

export default async (req: Request) => {
	const bearer = req.headers.authorization;
	if (!bearer) {
		return {};
	}

	const token = bearer.split(' ')[1];

	if (!token) {
		return {};
	}

	const userFromToken = jwt.verify(token, process.env.JWT_SECRET as string) as {
		id: string;
		role: string;
	};
	console.log('userFromToken=', userFromToken);

	if (!userFromToken) {
		throw new GraphQLError('User is not authenticated', {
			extensions: {
				code: 'AUTHENTICATION_ERROR',
				http: {status: 401},
			},
		});
	}

	const user: IUserIdWithToken = {
		id: userFromToken.id,
		token,
		role: userFromToken.role,
	};

	return user;
};
