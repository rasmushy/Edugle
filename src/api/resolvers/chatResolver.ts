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
		chatByUser: async (_parent: unknown, args: {token: string}) => {
			console.log('args.token', args.token);
			const userId = authUser(args.token);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const chats = await chatModel.find({users: userId});
			const plainChats = chats.map((chat) => chat.toJSON() as Chat);
			console.log(plainChats);
			return plainChats[0];
		},
		chatById: async (_parent: unknown, args: {id: string}) => {
			const response: Chat = (await chatModel.findById(args.id)) as Chat;
			const newChat = {
				...response.toJSON(),
				users: response.users.map((user) => user._id),
				messages: response.messages.map((message) => message._id),
			};
			return newChat;
		},
	},
	Mutation: {
		leaveChat: async (_parent: unknown, args: {chatId: string; userToken: string}) => {
			const chat = await chatModel.findById(args.chatId);
			//console.log('leaveChat: chat=', chat);
			if (!chat) {
				throw new GraphQLError('Chat not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			const userId = authUser(args.userToken);
			console.log('leaveChat: userId=', userId);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}

			chat.users = chat.users.filter((user) => user._id.toString() !== userId);
			const updatedChat = await chat.save();
			//console.log('leaveChat: updatedChat=', updatedChat);
			pubsub.publish('CHAT_ENDED', {chatEnded: updatedChat});
			return updatedChat;
		},

		joinChat: async (_parent: unknown, args: {chatId: string; userToken: string}) => {
			//console.log('joinChat: args=', args);
			const chat = await chatModel.findById(args.chatId);
			if (!chat) {
				return Error('Chat not found');
			}

			const userId = convertToken(args.userToken);
			if (!userId) {
				return Error('Not authorized');
			}

			const user = await userModel.findById(userId);

			//console.log('joinChat: user=', user);
			if (!user) {
				return Error('User not found');
			}

			const chatWithUser = await chatModel.findOne({users: {$all: [userId, args.chatId]}});

			//console.log('joinChat: chatWithUser=', chatWithUser);
			if (chatWithUser) {
				return Error('User already in chat');
			}

			chat.users.push(user);
			const updatedChat = await chat.save();
			//console.log('updatedChat users', updatedChat.users);
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
			pubsub.publish('NEW_CHAT_STARTED', {newChatStarted: createChat});
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
	Subscription: {
		chatEnded: {
			subscribe: () => pubsub.asyncIterator('CHAT_ENDED'),
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
