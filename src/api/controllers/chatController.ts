import chatModel from '../models/chatModel';
import CustomError from '../../classes/CustomError';
import {Request, Response, NextFunction} from 'express';
import {Chat} from '../../interfaces/Chat';

const initiateChat = async (req: Request, res: Response<Chat>, next: NextFunction) => {
	const users = req.body.us;
	const user1 = users[0];
	const user2 = users[1];
	try {
		const chat: Chat = await chatModel.create({
			created_date: new Date(),
			users: [user1, user2],
			messages: [],
		});
		return chat as Chat;
	} catch (error) {
		next(new CustomError((error as Error).message, 500));
	}
};

export {initiateChat};
