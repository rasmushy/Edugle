import {GraphQLError} from 'graphql';
import {Chat} from '../../interfaces/Chat';
import {Message} from '../../interfaces/Message';
import {UserIdWithToken} from '../../interfaces/User';
import chatModel from '../models/chatModel';
import {PubSub} from 'graphql-subscriptions';

const pubsub = new PubSub();

export default {
	Message: {
		sender: async (parent: Message) => {
			const response = await fetch(`${process.env.USERS_API}/users/${parent.sender}`);
			if (!response.ok) {
				throw new GraphQLError(response.statusText, {
					extensions: {code: 'NOT_FOUND'},
				});
			}
			const user = await response.json();
			return user;
		},
	},
	Query: {
		chatByUser: async (_parent: unknown, args: UserIdWithToken) => {
			return await chatModel.find({users: args.id});
		},
	},
	Mutation: {
		createChat: async (_parent: unknown, args: Chat, user: UserIdWithToken) => {
			if (!user.token) return null;
			const chat: Chat = new chatModel({
				created_date: args.created_date,
				users: [user.id],
				messages: [],
			}) as Chat;
			const createChat: Chat = (await chatModel.create(chat)) as Chat;
			if (!createChat) {
				throw new GraphQLError('Failed to create chat', {
					extensions: {code: 'NOT_CREATED'},
				});
			}
			return createChat;
		},
		deleteChatAsAdmin: async (_parent: unknown, args: Chat, user: UserIdWithToken) => {
			if (!user.token || user.role !== 'admin') {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const deleteChat: Chat = (await chatModel.findByIdAndDelete(args.id)) as Chat;
			return deleteChat;
		},
	},
};
