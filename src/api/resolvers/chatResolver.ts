import {GraphQLError} from 'graphql';
import {Chat} from '../../interfaces/Chat';
import {Message} from '../../interfaces/Message';
import {UserIdWithToken, AdminIdWithToken} from '../../interfaces/User';
import chatModel from '../models/chatModel';

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
		chats: async () => {
			const response = await chatModel.find({});
			return response;
		},
		chatByUser: async (_parent: unknown, args: UserIdWithToken) => {
			return await chatModel.find({users: args.id});
		},
	},
	Mutation: {
		createChat: async (_parent: unknown, args: {chat: Chat; user: UserIdWithToken}) => {
			console.log(args);
			console.log(args.chat + 'mit vit');
			if (!args.user.token) return null;
			const chat: Chat = new chatModel({
				created_date: args.chat.created_date,
				users: [args.chat.users[0], args.chat.users[1]],
				messages: [],
			}) as Chat;
			console.log('vielä elossa');
			const createChat: Chat = (await chatModel.create(chat)) as Chat;
			if (!createChat) {
				throw new GraphQLError('Failed to create chat', {
					extensions: {code: 'NOT_CREATED'},
				});
			}
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
