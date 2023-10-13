import {GraphQLError} from 'graphql';
import {Message, newMessage} from '../../interfaces/Message';
import {Chat} from '../../interfaces/Chat';
import dotenv from 'dotenv';
import messageModel from '../models/messageModel';
import userModel from '../models/userModel';
import chatModel from '../models/chatModel';
import authUser from '../../utils/auth';
import {PubSub} from 'graphql-subscriptions';
import {User} from '../../interfaces/User';
dotenv.config();

const pubsub = new PubSub();
const deletedUser: User = new userModel({
	username: 'DELETED',
	email: 'DELETED',
	password: 'DELETED',
	description: 'DELETED',
	avatar: 'DELETED',
	lastLogin: 1697133837252,
	role: 'DELETED',
	likes: 404,
}) as User;

export default {
	Subscription: {
		messageCreated: {
			subscribe: (_parent: unknown, arg: {chatId: string}) => pubsub.asyncIterator([arg.chatId]),
		},
	},
	Message: {
		sender: async (parent: Message) => {
			try {
				const response = await userModel.findById(parent.sender.toJSON());
				if (response === null) {
					return deletedUser;
				}
				return response as User;
			} catch (error: any) {
				throw new GraphQLError(error.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
			}
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
			const userId = convertToken(args.userToken);
			const messages = await messageModel.find({sender: userId});
			return messages;
		},
		messagesBySenderId: async (_parent: unknown, args: {userId: string}) => {
			const messages = await messageModel.find({sender: args.userId});
			return messages;
		},
	},

	Mutation: {
		createMessage: async (_parent: unknown, args: {chatId: string; message: newMessage}) => {
			if (!args.message.senderToken) {
				throw new GraphQLError('No token', {
					extensions: {code: 'NO_TOKEN'},
				});
			}
			const userId = authUser(args.message.senderToken);
			if (!userId) {
				throw new GraphQLError('Token conversion failed', {
					extensions: {code: 'FAILED_TO_CONVERT'},
				});
			}
			const chat: Chat = (await chatModel.findById(args.chatId)) as Chat;
			if (!chat) {
				throw new GraphQLError('Chat not found', {
					extensions: {code: 'NOT_FOUND'},
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
					extensions: {code: 'FAILED_TO_CREATE'},
				});
			}
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
			if (!args.userToken) {
				throw new GraphQLError('No token', {
					extensions: {code: 'NO_TOKEN'},
				});
			}
			const userId = authUser(args.userToken);
			if (!userId) {
				throw new GraphQLError('Token conversion failed', {
					extensions: {code: 'FAILED_TO_CONVERT'},
				});
			}
			const message: Message = (await messageModel.findById(args.messageId)) as Message;
			if (message.sender.toString() !== userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.messageId)) as Message;
			return deleteMessage;
		},

		deleteMessageAsAdmin: async (_parent: unknown, args: {messageId: string; userToken: string}) => {
			if (!args.userToken) {
				throw new GraphQLError('No token', {
					extensions: {code: 'NO_TOKEN'},
				});
			}
			const userId = authUser(args.userToken);
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
};

const convertToken = (token: string) => {
	if (!token) {
		throw new GraphQLError('No token', {
			extensions: {code: 'NO_TOKEN'},
		});
	}
	const userId = authUser(token);
	if (!userId) {
		throw new GraphQLError('Token conversion failed', {
			extensions: {code: 'FAILED_TO_CONVERT'},
		});
	}
	return userId;
};
