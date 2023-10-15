import {GraphQLError} from 'graphql';
import {PubSub, withFilter} from 'graphql-subscriptions';
import {Chat} from '../../interfaces/Chat';
import chatModel from '../models/chatModel';
import userModel from '../models/userModel';
import messageModel from '../models/messageModel';
import authUser from '../../utils/auth';
import pubsub from '../../utils/pubsub';
import {User} from '../../interfaces/User';
const deletedUser: User = new userModel({
	id: 'DELETED',
	
}) as User;

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

export default {
	Chat: {
		users: async (parent: Chat) => {
			try {
				const response = await userModel.find({_id: {$in: parent.users}}, {password: 0});
/* 				const modifiedResponse = response.map((user) => {
					if (user === null) {
					console.log('user', user);
						return deletedUser;
					}

					return user;
				}); */

				return response
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
/* 				const modifiedResponse = response.map((message) => {
					if (!message.sender === "Deleted User") {
						console.log('message.sender', message.sender);
						message.sender = deletedUser;
					}
					return message;
				}); */
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
		chatsByUser: async (_parent: unknown, args: {userToken: string}) => {
			console.log('args.token', args.userToken);
			const userId = authUser(args.userToken);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			const chats = await chatModel.find({users: userId});
			console.log('chats', chats);
			if (!chats) {
				throw new GraphQLError('No chats found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}
			const plainChats = chats.map((chat) => chat.toJSON() as Chat);
			console.log(plainChats);
			return plainChats;
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
			if (!chat) {
				console.log('leaveChat: chat not found', args.chatId);
				throw new GraphQLError('Chat not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			const userId = authUser(args.userToken);
			const leavingUser = await userModel.findById(userId);
			console.log('leaveChat: leavingUser=', leavingUser);
			if (!leavingUser) {
				throw new GraphQLError('User not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			chat.users = chat.users.filter((user) => user._id.toString() !== userId);
			console.log('leaveChat: chat.users=', chat.users);
			const updatedChat = await chat.save();
			pubsub.publish('USER_LEFT_CHAT', {
				updatedChat: {
					eventType: 'USER_LEFT_CHAT',
					message: `${leavingUser.username} has left chat`,
					chat: updatedChat,
					timestamp: Date.now(),
				},
			});
			return updatedChat;
		},

		joinChat: async (_parent: unknown, args: {chatId: string; token: string}) => {
			const chat = await chatModel.findById(args.chatId);
			if (!chat) {
				console.log('joinChat: chat not found', args.chatId);
				throw new GraphQLError('Chat not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			const userId = authUser(args.token);
			const user = await userModel.findById(userId);
			if (!user || !userId) {
				console.log('joinChat: user not found', userId);
				throw new GraphQLError('User not found', {
					extensions: {code: 'NOT_FOUND'},
				});
			}

			//add user to chat if not already in chat
			if (!chat.users.some((user) => user._id.toString() === userId)) {
				chat.users.push(user);
			}

			const updatedChat = await chat.save();
			pubsub.publish('USER_JOINED_CHAT', {
				updatedChat: {
					eventType: 'USER_JOINED_CHAT',
					message: `${user.username} has joined chat`,
					chat: chat,
					timestamp: Date.now(),
				},
			});
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
			pubsub.publish('CHAT_STARTED', {
				updatedChat: {eventType: 'CHAT_STARTED', message: `Created chat for no reason at all`, chat: createChat, timestamp: Date.now()},
			});
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
		updatedChat: {
			subscribe: withFilter(
				() => pubsub.asyncIterator(['USER_JOINED_CHAT', 'USER_LEFT_CHAT', 'CHAT_STARTED', 'USER_SENT_MESSAGE']),
				(payload, variables) => {
					console.log('updatedChat payload: ', payload.updatedChat);
					console.log('updatedChat chatId: ', payload.updatedChat.chat.id);
					console.log('updatedChat variables.userId: ', variables.userId);
					console.log('updatedChat users: ', payload.updatedChat.chat.users);
					try {
						return payload.updatedChat.chat.users.filter((user: any) => user._id.toString() === variables.userId).length > 0;
					} catch (err) {
						console.error('Filter function error:', err);
						return false;
					}
				},
			),
		},
	},
};
