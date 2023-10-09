import {Types} from 'mongoose';
import {GraphQLError} from 'graphql';
import {Message, newMessage} from '../../interfaces/Message';
import {Chat} from '../../interfaces/Chat';
import dotenv from 'dotenv';
import {AdminIdWithToken, UserIdWithToken} from '../../interfaces/User';
import {User} from '../../interfaces/User';
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
		messageById: async (_parent: unknown, args: {messageId: string}) => {
			return await messageModel.findById(args.messageId);
		},
		messagesBySenderToken: async (_parent: unknown, args: {userToken: string}) => {
			const messages = await messageModel.find({sender: authUser(args.userToken)});
			return messages;
		},
		messagesBySenderId: async (_parent: unknown, args: {userId: string}) => {
			const messages = await messageModel.find({sender: args.userId});
			return messages;
		},
	},

	Mutation: {
		createMessage: async (_parent: unknown, args: {chatId: string; message: newMessage}) => {
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
			if (!createMessage) {
				throw new GraphQLError('Failed to create message', {
					extensions: {code: 'NOT_CREATED'},
				});
			}
			const chat: Chat = (await chatModel.findById(args.chatId)) as Chat;
			chat.messages.push(createMessage.id);
			await chat.save();

			pubsub.publish(args.chatId, {
				messageCreated: {
					id: createMessage.id,
					created_date: Date.now(),
					messages: chat.messages,
					users: userId,
				},
			});
			return createMessage;
		},

		deleteMessage: async (_parent: unknown, args: {messageId: string; userToken: string}) => {
			const message: Message = (await messageModel.findById(args.messageId)) as Message;
			if (!args.userToken || message.sender.toString() !== authUser(args.userToken)) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.messageId)) as Message;
			return deleteMessage;
		},

		deleteMessageAsAdmin: async (_parent: unknown, args: {messageId: string; userToken: string | null}) => {
			const userToken = args.userToken;
			if (!userToken) {
				throw new GraphQLError('No toke', {
					extensions: {code: 'NO_TOKEN'},
				});
			}
			const userId = authUser(userToken);
			if (!userId) {
				throw new GraphQLError('Token conversion failed', {
					extensions: {code: 'FAILED_TO_CONVERT'},
				});
			}
			const user = await userModel.findById(userId);
			if (!user || user.role !== 'admin') {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.messageId)) as Message;
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
