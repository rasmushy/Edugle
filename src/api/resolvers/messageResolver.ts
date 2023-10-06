import {Types} from 'mongoose';
import {GraphQLError} from 'graphql';
import {Message} from '../../interfaces/Message';
import {Chat} from '../../interfaces/Chat';
import dotenv from 'dotenv';
import {AdminIdWithToken, UserIdWithToken} from '../../interfaces/User';
import messageModel from '../models/messageModel';
import userModel from '../models/userModel';
import chatModel from '../models/chatModel';
dotenv.config();

export default {
	Query: {
		messages: async () => {
			const response = await messageModel.find({});
			return response;
		},
		messageById: async (_parens: unknown, args: Message) => {
			return await messageModel.findById(args.id);
		},
		messagesBySender: async (_parent: unknown, args: UserIdWithToken) => {
			return await messageModel.find({sender: args.id});
		},
	},
	Mutation: {
		createMessage: async (_parent: unknown, args: {chat: string; message: Message; user: UserIdWithToken}) => {
			if (!args.user.token) return;
			args.message.sender = args.user.id as unknown as Types.ObjectId;
			const newMessage: Message = new messageModel({
				date: Date.now(),
				content: args.message.content,
				sender: args.message.sender,
			}) as Message;
			const createMessage: Message = (await messageModel.create(newMessage)) as Message;
			if (!createMessage) {
				throw new GraphQLError('Failed to create message', {
					extensions: {code: 'NOT_CREATED'},
				});
			}
			const chat: Chat = (await chatModel.findById(args.chat)) as Chat;
			chat.messages.push(createMessage._id);
			await chat.save();
			return createMessage;
		},
		deleteMessage: async (_parent: unknown, args: {id: String; user: UserIdWithToken}) => {
			const message: Message = (await messageModel.findById(args.id)) as Message;
			if (!args.user.token || message.sender.toString() !== args.user.id) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.id)) as Message;
			return deleteMessage;
		},
		deleteMessageAsAdmin: async (_parent: unknown, args: {id: string; admin: AdminIdWithToken}) => {
			if (!args.admin.token || args.admin.role !== 'admin') {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.id)) as Message;
			return deleteMessage;
		},
	},
	/* Old using experimental fetch API
	Message: {
		sender: async (parent: Message) => {
			const response = await fetch(`${process.env.AUTH_URL}/users/${parent.sender.toJSON()}`);
			if (!response.ok) {
				throw new GraphQLError(response.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
			}
			const user = await response.json();
			return user;
		},
	}, */
	// New using mongoose, but returns user password
	Message: {
		sender: async (parent: Message) => {
			try {
				const response = await userModel.findById(parent.sender.toJSON());
				return response;
			} catch (error: any) {
				throw new GraphQLError(error.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
			}
		},
	},
};
