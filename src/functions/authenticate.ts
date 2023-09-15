import {Request} from 'express';
import jwt from 'jsonwebtoken';
import {IUserIdWithToken} from '../interfaces/IUser';

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
	};

	if (!userFromToken) {
		return {};
	}

	const userIdWithToken: IUserIdWithToken = {
		id: userFromToken.id,
		token,
	};

	return userIdWithToken;
};
