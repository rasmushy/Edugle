import {Request, Response, NextFunction} from 'express';
import CustomError from '../../classes/CustomError';
import {User, OutputUser, UserIdWithToken} from '../../interfaces/User';
import {validationResult} from 'express-validator';
import userModel from '../models/userModel';
import bcrypt from 'bcrypt';
import DBMessageResponse from '../../interfaces/DBMessageResponse';
// Description: This file contains the functions for the user routes
const salt = bcrypt.genSaltSync(12);

const check = (req: Request, res: Response) => {
	res.json({message: 'Server up'});
};

const userListGet = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const users = await userModel.find().select('-password');
		res.json(users);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

const userGet = async (req: Request<{id: String}>, res: Response, next: NextFunction) => {
	try {
		const user = await userModel.findById(req.params.id).select('-password');
		if (!user) {
			next(new CustomError('User not found', 404));
			return;
		}
		res.json(user);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

const userPost = async (req: Request<{}, {}, User>, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const messages = errors
				.array()
				.map((error) => `${error.msg}: ${error.param}`)
				.join(', ');
			next(new CustomError(messages, 400));
			return;
		}

		// Check if user already exists or email is already in use

		const userExists = await userModel.findOne({$or: [{username: req.body.username}, {email: req.body.email}]});

		if (userExists) {
			next(new CustomError('User already exists', 400));
			return;
		}

		const user = req.body;
		user.password = await bcrypt.hash(user.password, salt);

		const newUser = await userModel.create(user);
		const response: DBMessageResponse = {
			message: 'User created',
			user: {
				username: newUser.username,
				email: newUser.email,
				id: newUser._id,
				password: newUser.password,
				description: newUser.description,
			},
		};
		res.json(response);
	} catch (error) {
		next(new CustomError('User creation failed', 500));
	}
};

const userPutAsAdmin = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userFromToken: UserIdWithToken = res.locals?.user as UserIdWithToken;
		if (userFromToken.role === undefined || !userFromToken.role.toLowerCase().includes('admin')) {
			next(new CustomError('Unauthorized', 401));
			return;
		}

		const modifyUserID = req.body.id;

		if (modifyUserID === undefined) {
			next(new CustomError('User not found', 404));
			return;
		}

		if (modifyUserID === userFromToken.id) {
			next(new CustomError('Cannot delete access from yourself', 401));
			return;
		}

		const user = {
			role: req.body.role ? req.body.role : 'user',
		};

		const result: User = (await userModel.findByIdAndUpdate(modifyUserID, user, {new: true})) as User;

		if (!result) {
			next(new CustomError('User not found', 404));
			return;
		}

		const response: DBMessageResponse = {
			message: 'User updated',
			user: {
				username: result.username,
				email: result.email,
				id: result._id,
				role: result.role,
			},
		};

		res.json(response);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

const userDelete = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userFromToken: OutputUser = res.locals?.user as OutputUser;
		const userId = userFromToken;
		const result: User = (await userModel.findByIdAndDelete(userId)) as User;
		if (!result) {
			next(new CustomError('User not found', 404));
			return;
		}

		const response: DBMessageResponse = {
			message: 'User deleted',
			user: {
				username: result.username,
				email: result.email,
				id: result._id,
				password: result.password,
			},
		};

		res.json(response);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

const userDeleteAsAdmin = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.params.id;

		if (req.headers.role === undefined || !req.headers.role.includes('admin')) {
			next(new CustomError('Unauthorized', 401));
			return;
		}
		const result: User = (await userModel.findByIdAndDelete(userId)) as User;
		if (!result) {
			next(new CustomError('User not found', 404));
			return;
		}

		const response: DBMessageResponse = {
			message: 'User deleted',
			user: {
				username: result.username,
				email: result.email,
				id: result._id,
				password: result.password,
			},
		};

		res.json(response);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

const userPut = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.body.id;

		if (userId === undefined || userId === '') {
			next(new CustomError('User not found', 404));
			return;
		}

		const user = {
			description: req.body.description,
		};

		const result: User = (await userModel.findByIdAndUpdate(userId, user, {new: true})) as User;
		if (!result) {
			next(new CustomError('User not found', 404));
			return;
		}

		const response: DBMessageResponse = {
			message: 'User updated',
			user: {
				description: result.description,
				username: result.username,
				email: result.email,
				id: result._id,
			},
		};

		res.json(response);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

const checkToken = async (req: Request, res: Response, next: NextFunction) => {
	const userFromToken: OutputUser = res.locals.user as OutputUser;
	const message: DBMessageResponse = {
		message: 'Token is valid',
		user: userFromToken,
	};

	res.json(message);
};

const checkAdmin = async (req: Request, res: Response, next: NextFunction) => {
	const userId = res.locals.user.id;
	console.log('userId', userId);
	if (!res.locals.user.role.toLowerCase().includes('admin')) {
		next(new CustomError('Unauthorized', 401));
		return;
	}

	const user: User = (await userModel.findById(userId)) as User;

	const message: DBMessageResponse = {
		message: 'User is admin',
		user: user,
	};

	res.json(message);
};

export {userPost, userPut, userDelete, check, userListGet, userGet, checkToken, userDeleteAsAdmin, userPutAsAdmin, checkAdmin};
