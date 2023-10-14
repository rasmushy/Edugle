import {GraphQLError} from 'graphql';
import {Chat} from '../../interfaces/Chat';
import chatModel from '../models/chatModel';
import userModel from '../models/userModel';
import messageModel from '../models/messageModel';
import authUser from '../../utils/auth';

import {PubSub} from 'graphql-subscriptions';
const pubsub = new PubSub();

export default {
	Chat: {
		users: async (parent: Chat) => {
			try {
				const response = await userModel.find({_id: {$in: parent.users}});
				return response;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('Failed to get users for chat id: ' + parent._id);
			}
		},
		messages: async (parent: Chat) => {
			if (parent.messages.length < 1) return [];
			try {
				const response = await messageModel.find({_id: {$in: parent.messages}});
				const foundIds = response.map((message) => message._id.toString());
				const missingIds = parent.messages.filter((id) => !foundIds.includes(id.toString()));
				if (missingIds.length > 0) {
					await chatModel.updateOne({_id: parent._id}, {$pullAll: {messages: missingIds}});
				}
				return response;
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(error.message);
				}
				throw new Error('Failed to get messages for chat id: ' + parent._id);
			}
		},
	},
	Query: {
		chats: async () => {
			const response = await chatModel.find({});
			return response;
		},
		chatsByUser: async (_parent: unknown, args: {userId: string}) => {
			if (!args.userId) {
				return Error('No id');
			}
			const response = await chatModel.find({users: {$all: [args.userId]}});
			return response;
		},
	},
	Mutation: {
		joinChat: async (_parent: unknown, args: {chatId: string; userToken: string}) => {
			const chat = await chatModel.findById(args.chatId);
			if (!chat) {
				return Error('Chat not found');
			}

			const userId = convertToken(args.userToken);
			if (!userId) {
				return Error('Not authorized');
			}

			const user = await userModel.findById(userId);

			if (!user) {
				return Error('User not found');
			}

			const chatWithUser = await chatModel.findOne({users: {$all: [userId, args.chatId]}});

			if (chatWithUser) {
				return Error('User already in chat');
			}

			chat.users.push(user);
			const updatedChat = await chat.save();
			return updatedChat;
		},
		createChat: async (_parent: unknown, args: {chat: Chat}) => {
			const newChat: Chat = new chatModel({
				created_date: Date.now(),
				users: args.chat.users,
				messages: [],
			}) as Chat;
			const createChat: Chat = (await chatModel.create(newChat)) as Chat;
			if (!createChat) {
				throw new GraphQLError('Failed to create chat', {
					extensions: {code: 'NOT_CREATED'},
				});
			}
			return createChat;
		},
		deleteChatAsAdmin: async (_parent: unknown, args: {chatId: string; userToken: string}) => {
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
			const deleteChat: Chat = (await chatModel.findByIdAndDelete(args.chatId)) as Chat;
			return deleteChat;
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
