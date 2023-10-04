import {Types} from 'mongoose';
import {GraphQLError} from 'graphql';
import {Message} from '../../interfaces/Message';
import dotenv from 'dotenv';
import {UserIdWithToken} from '../../interfaces/User';
import messageModel from '../models/messageModel';
dotenv.config();

export default {
	Query: {
		messages: async () => {
			const response = await messageModel.find({});

			console.log(response);

			response.map((message: Message) => {
				message.id = message._id;
				delete message._id;
				return message;
			});

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
		createMessage: async (_parent: unknown, args: {message: Message; user: UserIdWithToken}) => {
			if (!args.user.token) return;
			args.message.sender = args.user.id as unknown as Types.ObjectId;
			const newMessage: Message = new messageModel({
				date: args.message.date,
				content: args.message.content,
				sender: args.message.sender,
			}) as Message;
			const createMessage: Message = (await messageModel.create(newMessage)) as Message;
			if (!createMessage) {
				throw new GraphQLError('Failed to create message', {
					extensions: {code: 'NOT_CREATED'},
				});
			}
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
		deleteMessageAsAdmin: async (_parent: unknown, args: Message, user: UserIdWithToken) => {
			if (!user.token || user.role !== 'admin') {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.id)) as Message;
			return deleteMessage;
		},
	},
};
