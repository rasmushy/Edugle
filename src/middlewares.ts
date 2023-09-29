import {NextFunction, Request, Response} from 'express';
import ErrorResponse from './interfaces/ErrorResponse';
import jwt from 'jsonwebtoken';
import {OutputUser, TokenUser} from './interfaces/User';
import userModel from './api/models/userModel';

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
		if (!bearer) {
			return;
		}

		const token = bearer.split(' ')[1];

		if (!token) {
			return;
		}

		const userFromToken = jwt.verify(token, process.env.JWT_SECRET as string) as TokenUser;

		const user = (await userModel.findById(userFromToken.id).select('-password, -role')) as OutputUser;

		if (!user) {
			return;
		}

		res.locals.user = user;
		res.locals.role = userFromToken.role;

		next();
	} catch (error) {
		return;
	}
};
