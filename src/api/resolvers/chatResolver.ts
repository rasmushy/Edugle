import {GraphQLError} from 'graphql';
import {Chat} from '../../interfaces/Chat';
import {UserIdWithToken, AdminIdWithToken} from '../../interfaces/User';
import chatModel from '../models/chatModel';
import userModel from '../models/userModel';
import messageModel from '../models/messageModel';

import {PubSub} from 'graphql-subscriptions';

const pubsub = new PubSub();

export default {
	Subscription: {
		messageCreated: {
			subscribe: (_parent: unknown, args: {chatId: string}) => pubsub.asyncIterator('messages'),
		},
	},
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
			try {
				const response = await messageModel.find({_id: {$in: parent.messages}});
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
		createChat: async (_parent: unknown, args: {chat: Chat}) => {
			console.log(args.chat.users);
			if (args.chat.users.length < 2) return null;
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
			console.log(createChat);
			pubsub.publish('messages', {
				messageCreated: {
					id: createChat.id,
					created_date: createChat.created_date,
					users: createChat.users,
					messages: createChat.messages,
				},
			});
			return createChat;
		},
		deleteChatAsAdmin: async (_parent: unknown, args: {id: String; admin: AdminIdWithToken}) => {
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
