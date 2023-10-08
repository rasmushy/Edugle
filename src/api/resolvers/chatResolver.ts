import {GraphQLError} from 'graphql';
import {Chat} from '../../interfaces/Chat';
import {UserIdWithToken, AdminIdWithToken} from '../../interfaces/User';
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
			} catch (error: any) {
				throw new GraphQLError(error.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
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
			} catch (error: any) {
				throw new GraphQLError(error.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
			}
		},
	},
	Query: {
		chats: async () => {
			const response = await chatModel.find({});
			return response;
		},
		chatByUser: async (_parent: unknown, args: UserIdWithToken) => {
			return await chatModel.find({users: args.id});
		},
	},
	Mutation: {
		joinChat: async (_parent: unknown, args: {chatId: string; token: string}) => {
			const chat = await chatModel.findById(args.chatId);
			if (!chat) {
				throw new GraphQLError('Chat not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			const userId = authUser(args.token);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}

			const user = await userModel.findById(userId);

			if (!user) {
				throw new GraphQLError('User not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			const chatWithUser = await chatModel.findOne({users: {$all: [userId, args.chatId]}});

			if (chatWithUser) {
				throw new GraphQLError('User already in chat', {
					extensions: {code: 'NOT_FOUND'},
				});
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
		deleteChatAsAdmin: async (_parent: unknown, args: {id: String; admin: AdminIdWithToken}) => {
			console.log('ligma')
			if (!args.admin.token || args.admin.role !== 'admin') {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteChat: Chat = (await chatModel.findByIdAndDelete(args.id)) as Chat;
			return deleteChat;
		},
	},
};
