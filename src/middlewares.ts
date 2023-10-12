import {NextFunction, Request, Response} from 'express';
import ErrorResponse from './interfaces/ErrorResponse';
import jwt from 'jsonwebtoken';
import {OutputUser, TokenUser, User} from './interfaces/User';
import {GraphQLError} from 'graphql';
import userModel from './api/models/userModel';
import CustomError from './classes/CustomError';
import {getCookie, hasCookie} from 'cookies-next';

export function notFound(req: Request, res: Response, next: NextFunction) {
	res.status(404);
	const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
	next(error);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response<ErrorResponse>, next: NextFunction) {
	const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
	res.status(statusCode);
	res.json({
		message: err.message,
		stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
	});
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const bearer = req.headers.authorization;
		const token = bearer?.split(' ')[1];
		if (!token) {
			next(new CustomError('User not authenticated', 401));
		}

		const userFromToken = jwt.verify(token as string, process.env.JWT_SECRET as string) as TokenUser;
		if (!userFromToken) {
			next(new CustomError('User not authenticated', 401));
		}
		const user = (await userModel.findById(userFromToken.id).select('-password')) as User;

		if (!user) {
			throw new GraphQLError('User not found', {
				extensions: {
					code: 'USER_NOT_FOUND',
					http: {status: 401},
				},
			});
		}

		res.locals.user = user;

		next();
	} catch (error) {
		next(
			new GraphQLError('User not authenticated', {
				extensions: {
					code: 'AUTHENTICATION_ERROR',
					http: {status: 401},
				},
			}),
		);
	}
};
