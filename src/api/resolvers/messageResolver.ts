import {Message, newMessage} from '../../interfaces/Message';
import {Chat} from '../../interfaces/Chat';
import messageModel from '../models/messageModel';
import userModel from '../models/userModel';
import chatModel from '../models/chatModel';
import authUser from '../../utils/auth';
import {withFilter} from 'graphql-subscriptions';
import pubsub from '../../utils/pubsub';
import {User} from '../../interfaces/User';
import {GraphQLError} from 'graphql/error/GraphQLError';

const deletedUser: User = new userModel({
	id: 'DELETED',
}) as User;

export default {
	Subscription: {
		messageCreated: {
			subscribe: withFilter(
				() => pubsub.asyncIterator(['MESSAGE_CREATED']),
				(payload, variables) => {
					return payload.messageCreated.chatId === variables.chatId;
				},
			),
		},
	},
	Message: {
		sender: async (parent: Message) => {
			try {
				const response = await userModel.findById(parent.sender.toJSON(), {password: 0});
				if (!response) {
					return deletedUser;
				}
				return response;
			} catch (error: any) {
				throw new GraphQLError(error.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
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
			if (!createMessage) return;
			chat.messages.push(createMessage.id);
			await chat.save();
			pubsub.publish('MESSAGE_CREATED', {
				messageCreated: {
					message: createMessage,
					chatId: chat.id,
					timestamp: Date.now(),
				},
			});
			pubsub.publish('USER_SENT_MESSAGE', {
				updatedChat: {
					eventType: 'USER_SENT_MESSAGE',
					message: `User: ${userId} sent message`,
					chat: chat,
					timestamp: Date.now(),
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
