import {Request, Response, NextFunction} from 'express';
import {User} from '../../interfaces/User';
import {validationResult} from 'express-validator';
import userModel from '../models/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import LoginMessageResponse from '../../interfaces/LoginMessageResponse';
import CustomError from '../../classes/CustomError';

const loginPost = async (req: Request<{}, {}, {username: string; password: string}>, res: Response, next: NextFunction) => {
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

		const {username, password} = req.body;
		const user: User = (await userModel.findOne({email: username})) as User;

		if (!user) {
			next(new CustomError('Incorrect username/password', 403));
			return;
		}

		if (!(await bcrypt.compare(password, user.password))) {
			next(new CustomError('Incorrect username/password', 403));
			return;
		}

		const token = jwt.sign({id: user._id}, process.env.JWT_SECRET as string);

		const message: LoginMessageResponse = {
			message: 'Login successful',
			user: {
				username: user.username,
				email: user.email,
				id: user._id,
				password: user.password,
				role: user.role,
				lastLogin: new Date(),
			},
			token: token,
		};

		res.json(message);
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

export {loginPost};
