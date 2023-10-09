import {Types} from 'mongoose';
import {GraphQLError} from 'graphql';
import {Message, newMessage} from '../../interfaces/Message';
import {Chat} from '../../interfaces/Chat';
import dotenv from 'dotenv';
import {AdminIdWithToken, UserIdWithToken} from '../../interfaces/User';
import messageModel from '../models/messageModel';
import userModel from '../models/userModel';
import chatModel from '../models/chatModel';
import authUser from '../../utils/auth';
import {PubSub} from 'graphql-subscriptions';
dotenv.config();

const pubsub = new PubSub();

export default {
	Subscription: {
		messageCreated: {
			subscribe: (_parent: unknown, arg: {chatId: string}) => pubsub.asyncIterator([arg.chatId]),
		},
	},
	
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
		createMessage: async (_parent: unknown, args: {chat: string; message: newMessage}) => {
			if (!args.message.senderToken) return;
			const userId = authUser(args.message.senderToken);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}

			const newMessage: Message = new messageModel({
				date: Date.now(),
				content: args.message.content,
				sender: userId,
			}) as Message;

			const createMessage: Message = (await messageModel.create(newMessage)) as Message;
			console.log('createMessage', createMessage);
			if (!createMessage) {
				throw new GraphQLError('Failed to create message', {
					extensions: {code: 'NOT_CREATED'},
				});
			}

			const chat: Chat = (await chatModel.findById(args.chat)) as Chat;
			console.log('chat', chat);
			chat.messages.push(createMessage.id);
			await chat.save();

			pubsub.publish(args.chat, {
				messageCreated: {
					id: createMessage.id,
					created_date: Date.now(),
					messages: chat.messages,
					users: userId,
				},
			});
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
