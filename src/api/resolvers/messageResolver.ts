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
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('Failed to get sender for message id: ' + parent._id);
			}
		},
	},
	Query: {
		messages: async () => {
			const messages = await messageModel.find({});
			if (!messages) {
				return Error('No messages found');
			}
			return messages;
		},
		messageById: async (_parent: unknown, args: {messageId: string}) => {
			const message = await messageModel.findById(args.messageId);
			if (!message) {
				return Error('Message not found');
			}
			return message;
		},
		messagesBySenderToken: async (_parent: unknown, args: {userToken: string}) => {
			const userId = convertToken(args.userToken);
			if (userId instanceof Error) {
				return userId;
			}
			const messages = await messageModel.find({sender: userId});
			if (!messages) {
				return Error('No messages found');
			}
			return messages;
		},
		messagesBySenderId: async (_parent: unknown, args: {userId: string}) => {
			const messages = await messageModel.find({sender: args.userId});
			if (!messages) {
				return Error('No messages found');
			}
			return messages;
		},
	},

	Mutation: {
		createMessage: async (_parent: unknown, args: {chatId: string; message: newMessage}) => {
			const userId = convertToken(args.message.senderToken);
			if (userId instanceof Error) {
				return userId;
			}
			const chat: Chat = (await chatModel.findById(args.chatId)) as Chat;
			if (!chat) {
				return Error('Chat not found');
			}
			const newMessage: Message = new messageModel({
				date: Date.now(),
				content: args.message.content,
				sender: userId,
			}) as Message;
			const createMessage: Message = (await messageModel.create(newMessage)) as Message;
			if (!createMessage) {
				return Error('Failed to create message');
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
			const userId = convertToken(args.userToken);
			if (userId instanceof Error) {
				return userId;
			}
			const message: Message = (await messageModel.findById(args.messageId)) as Message;
			if (message.sender.toString() !== userId) {
				return Error('Not authorized!');
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.messageId)) as Message;
			return deleteMessage;
		},

		deleteMessageAsAdmin: async (_parent: unknown, args: {messageId: string; userToken: string}) => {
			const userId = convertToken(args.userToken);
			if (userId instanceof Error) {
				return userId;
			}
			const user = await userModel.findById(userId);
			if (!user || user.role !== 'admin') {
				return Error('Not authorized!');
			}
			const deleteMessage: Message = (await messageModel.findByIdAndDelete(args.messageId)) as Message;
			return deleteMessage;
		},
	},
};

const convertToken = (userToken: string) => {
	if (!userToken) {
		return Error('No token');
	}
	const userId = authUser(userToken);
	if (!userId) {
		return Error('Token conversion failed');
	}
	return userId;
};
