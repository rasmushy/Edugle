import queueModel from '../models/queueModel';
import {PubSub} from 'graphql-subscriptions';
import {GraphQLError} from 'graphql';
import {QueueEntry, QueueResponse} from '../../interfaces/Queue';
import authUser from '../../utils/auth';
import chatModel from '../models/chatModel';

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
		__resolveType(obj: any) {
			if (obj.chatId !== undefined) {
				return 'PairedChatResponse';
			}
			if (obj.position !== undefined) {
				return 'QueuePositionResponse';
			}
			return new GraphQLError('Invalid response type');
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
			return {status: 'User is in the queue', position: userInQueue.position};
		},
	},
	Mutation: {
		initiateChat: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			console.log('initiateChat: userId=', userId);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}

			// Check if user is already in the queue
			const userInQueue = await queueModel.findOne({userId: userId});
			if (userInQueue) {
				throw new GraphQLError('User is already in the queue', {
					extensions: {code: 'ALREADY_IN_QUEUE'},
				});
			}
			console.log('initiateChat: userInQueue=', userInQueue);

			// Check for the first user in the queue
			const firstInQueue = await queueModel.findOne().sort({joinedAt: 1}).limit(1);
			console.log('initiateChat: firstInQueue=', firstInQueue);

			if (firstInQueue) {
				// Create a chat & delete the first user in the queue
				const newChat = await chatModel.create({
					created_date: Date.now(),
					users: [],
					messages: [],
				});
				console.log('initiateChat: newChat=', newChat);
				await queueModel.findByIdAndDelete(firstInQueue.id);
				pubsub.publish('NEW_CHAT_STARTED', {newChatStarted: newChat});
				return {status: 'Chat started!', chatId: newChat.id};
				//Else add user to the queue
			} else {
				const currentPosition = (await getGlobalQueueCounter()) + 1;
				globalQueueCounter++;

				const newQueueEntry: QueueEntry = (await queueModel.create({
					userId: userId,
					position: currentPosition,
					joinedAt: new Date(),
				})) as QueueEntry;
				console.log('initiateChat: newQueueEntry=', newQueueEntry);
				pubsub.publish('USER_JOINED_QUEUE', {userJoinedQueue: newQueueEntry});
				return {status: 'Waiting for pairing...', position: currentPosition};
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
			// Update the positions of the remaining users in the queue
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
			});

			return {status: 'User removed from the queue', position: newPosition};
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
