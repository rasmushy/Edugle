import queueModel from '../models/queueModel';
import {PubSub} from 'graphql-subscriptions';
import {GraphQLError} from 'graphql';
import {QueueEntry, QueueResponse} from '../../interfaces/Queue';
import {Types as Type} from 'mongoose';
import authUser from '../../utils/auth';
import chatModel from '../models/chatModel';
import {initiateChat} from '../controllers/chatController';

const pubsub = new PubSub();

let globalQueueCounter: any = null;

//Optimizing the queue counter
async function getGlobalQueueCounter() {
	if (globalQueueCounter === null) {
		globalQueueCounter = await queueModel.countDocuments();
	}
	return globalQueueCounter;
}

function transformQueueEntry(queueEntry: QueueEntry): any {
	return {
		...queueEntry.toObject(),
		id: queueEntry._id.toString(),
		userId: {
			id: queueEntry.userId.toString(),
		},
	};
}

export default {
	ChatOrQueueResponse: {
		__resolveType(obj: QueueResponse) {
			if (obj.chatId) {
				return 'PairedChatResponse';
			}
			if (obj.position) {
				return 'QueuePositionResponse';
			}
			return null; // GraphQLError is thrown if returned null
		},
	},
	Query: {
		queue: async () => {
			const response = await queueModel.find({});
			return response.map((entry) => transformQueueEntry(entry));
		},
		queuePosition: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			const userInQueue = await queueModel.findOne({userId: userId});
			if (!userInQueue) {
				throw new GraphQLError('User is not in the queue', {});
			}
			return {position: userInQueue.position, status: 'User is in the queue'} as QueueResponse;
		},
	},

	Mutation: {
		initiateChat: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			console.log('userId', userId);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}

			const userInQueue = await queueModel.findOne({userId: userId});
			if (userInQueue) {
				throw new GraphQLError('User is already in the queue', {
					extensions: {code: 'ALREADY_IN_QUEUE'},
				});
			}

			console.log('userInQueue', userInQueue);
			// Check for the first user in the queue
			const firstInQueue = await queueModel.findOne().sort({joinedAt: 1}).limit(1);
			console.log('firstInQueue', firstInQueue);

			if (firstInQueue) {
				// Pair users and create a chat
				const newChat = await chatModel.create({
					created_date: Date.now(),
					users: [],
					messages: [],
				});

				console.log('newChat', newChat);
				// Remove both users from the queue
				await queueModel.findByIdAndDelete(firstInQueue.id);
				pubsub.publish('NEW_CHAT_STARTED', { newChatStarted: initiateChat });
				return {status: 'Chat started!', chatId: newChat.id};
			} else {
				const currentPosition = (await getGlobalQueueCounter()) + 1;
				globalQueueCounter++;

				const queueEntry: QueueEntry = new queueModel({
					userId: userId,
					position: currentPosition,
					joinedAt: new Date(),
				}) as QueueEntry;

				const createQueueEntry = await queueModel.create(queueEntry);
				pubsub.publish('USER_JOINED_QUEUE', {userJoinedQueue: initiateChat});
				return {status: 'Waiting for pairing...', position: createQueueEntry.position};
			}
		},
		dequeueUser: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			const userInQueue = await queueModel.findOne({userId: userId}); // check if user is in the queue
			if (!userInQueue) {
				throw new GraphQLError('User is not in the queue', {
					extensions: {code: 'NOT_FOUND', message: 'User is not in the queue'},
				});
			}
			console.log('userInQueue', userInQueue);
			await queueModel.findOneAndDelete({userId: userId}); // remove user from the queue

			const queueEntries = await queueModel.find().sort({joinedAt: 1}).exec();
			queueEntries.forEach(async (entry: any, index: number) => {
				entry.position = index + 1;
				await entry.save();
			});
			console.log('queueEntries', queueEntries);

			const newPosition = await queueModel.countDocuments();
			--globalQueueCounter;
			console.log('newPosition', newPosition);

			// Notify the next user in line, if any
			const usersToUpdate = await queueModel.find({position: {$gt: userInQueue.position}});
			usersToUpdate.forEach((user) => {
				pubsub.publish(`QUEUE_POSITION_${user.userId}`, {position: user.position - 1});
				console.log('userId', userId);
			});

			return {position: newPosition, status: 'User removed from the queue'};
		},
	},
	Subscription: {
		queuePositionUpdated: {
			subscribe: (_parent: unknown, args: {userId: string}) => {
				return pubsub.asyncIterator([`QUEUE_POSITION_${args.userId}`]);
			},
		},
		userJoinedQueue: {
			subscribe: () => {
				return pubsub.asyncIterator(['USER_JOINED_QUEUE']);
			},
		},
		userLeftQueue: {
			subscribe: () => {
				return pubsub.asyncIterator(['USER_LEFT_QUEUE']);
			},
		},
		newChatStarted: {
			subscribe: () => {
				return pubsub.asyncIterator(['NEW_CHAT_STARTED']);
			},
		},
	},
};
