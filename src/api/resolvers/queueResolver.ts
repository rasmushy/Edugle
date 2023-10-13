import queueModel from '../models/queueModel';
import {withFilter} from 'graphql-subscriptions';
import {GraphQLError} from 'graphql';
import {QueueEntry, QueueResponse} from '../../interfaces/Queue';
import authUser from '../../utils/auth';
import chatModel from '../models/chatModel';
import {User} from '../../interfaces/User';
import {PubSub} from 'graphql-subscriptions';

/*
TODO: have subscriptions for the following events:
- user online status

TODO: refactor the code to make it more readable
*/

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
			if(!userId) {
				return Error('Not authorized');
			}
			const userInQueue = await queueModel.findOne({userId: userId});
			if (!userInQueue) {
				return {status: 'Not in Queue', position: 0};
			}
			return {status: 'In queue', position: userInQueue.position + 1};
		},
	},
	Mutation: {
		//ENQUEUE USER & INITIATE CHAT
		initiateChat: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			//console.log('initiateChat: userId=', userId);
			if (!userId) {
				throw new GraphQLError('Not authorized', {
					extensions: {code: 'NOT_AUTHORIZED'},
				});
			}
			// Check if user is already in the queue
			const userInQueue = await queueModel.findOne({userId: userId});
			if (userInQueue) {
				console.log('initiateChat: userInQueue=', userInQueue.id);
				return ({status: 'In queue', position: userInQueue.position + 1});
			}

			// Find first user in queue
			const firstInQueue = await queueModel.findOne({}).sort({joinedAt: 1}).exec();

			if (firstInQueue) {
				console.log('initiateChat: firstInQueue=', firstInQueue?.id);
				// Create a chat & delete the first user in the queue
				const newChat = await chatModel.create({
					created_date: Date.now(),
					users: [firstInQueue.userId, userId],
					messages: [],
				});
				//console.log('initiateChat: newChat=', newChat);
				await queueModel.findByIdAndDelete(firstInQueue.id);
				--globalQueueCounter;

				// Publish chat update to the current user & the other user
				pubsub.publish(`CHAT_STARTED`, {chatStarted: newChat});

				return {status: 'Paired', chatId: newChat.id};
			} else {
				//Else add user to the queue
				const currentPosition = (await getGlobalQueueCounter()) + 1;
				globalQueueCounter++;

				const newQueueEntry: QueueEntry = (await queueModel.create({
					userId: userId,
					position: currentPosition,
					joinedAt: new Date(),
				})) as QueueEntry;

				console.log('initiateChat: newQueueEntry=', newQueueEntry.userId);
				return {status: 'Queue', position: currentPosition + 1};
			}
		},
		//DEQUEUE USER
		// Return pos 0 if not in queue, else pos > 0.
		dequeueUser: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			if(!userId) 
				return Error('Not authorized');
			
			const userInQueue = await queueModel.findOne({userId: userId}); // check if user is in the queue
			if (!userInQueue) {
					return {status: 'User not in queue', position: 0};
				};
			
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
				pubsub.publish(`QUEUE_POSITION_${user.userId}`, {position: user.position - 1, userId: user.userId});
			});

			return {status: 'User left from queue', position: newPosition};
		},
	},
	Subscription: {
		//pubsub.publish('USER_LEFT_QUEUE', {userLeftQueue: userInQueue});
		// subscribe: withFilter(
		// 	() => pubsub.asyncIterator(['QUEUE_POSITION_UPDATED']),
		// 	(payload, variables) => {
		// 		// Return position if the payload userId matches the userId argument
		// 		if (payload.userId.toString() === variables.userId) {
		// 			return payload.position;
		// 		}
		// 	},
		// ),
		queuePositionUpdated: {
			subscribe: (userId: string) => {
				return pubsub.asyncIterator([`QUEUE_POSITION_${userId}`]);
			},
		},
		chatStarted: {
			subscribe: withFilter(
				() => pubsub.asyncIterator(`CHAT_STARTED`),
				(payload, variables) => {
					const users = payload.chatStarted.users.map((user: User) => user._id.toString());
					console.log('chatStarted: users=', users);
					console.log('chatStarted: variables=', variables);
					return users.includes(variables.userId);
				},
			),
		},
		//admin type of stuff / analyze data
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
	},
};
