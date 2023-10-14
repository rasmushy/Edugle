import queueModel from '../models/queueModel';
import {withFilter} from 'graphql-subscriptions';
import {GraphQLError} from 'graphql';
import {QueueEntry, QueueResponse} from '../../interfaces/Queue';
import authUser from '../../utils/auth';
import chatModel from '../models/chatModel';
import {PubSub} from 'graphql-subscriptions';
import mongoose from 'mongoose';
import pubsub from '../../utils/pubsub';

function transformQueueEntry(queueEntry: QueueEntry): any {
	return {
		...queueEntry.toObject(),
		id: queueEntry._id.toString(),
		userId: {
			id: queueEntry.userId.toString(),
		},
	};
}

async function initiateChatLogic(userId: string) {
	//ENQUEUE USER
	// Check if user is already in the queue or not, lean() returns a plain JS object instead of full mongoose document.
	const userInQueue = await queueModel.findOne({userId: userId}).lean();
	if (userInQueue) {
		return {status: 'In queue', position: 0};
	}

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		// Find first user in queue
		const firstInQueue = await queueModel.findOne({}).sort({joinedAt: 1}).session(session).exec();

		if (firstInQueue) {
			// Pair the two users
			const newChat = await chatModel.create(
				[
					{
						created_date: Date.now(),
						users: [firstInQueue.userId, userId],
						messages: [],
					},
				],
				{session: session},
			);

			await queueModel.findByIdAndDelete(firstInQueue.id);

			pubsub.publish('CHAT_STARTED', {
				updatedChat: {
					eventType: 'CHAT_STARTED',
					message: `Chat started ${newChat[0].id}`,
					chat: newChat[0],
					timestamp: Date.now(),
				},
			});

			await session.commitTransaction();
			session.endSession();

			return {status: 'Paired', chatId: newChat[0].id};
		} else {
			// Enqueue the user
			await queueModel.create(
				[
					{
						userId: userId,
						joinedAt: new Date(),
					},
				],
				{session: session},
			);

			pubsub.publish('USER_JOINED_QUEUE', {message: `User joined queue`, timestamp: Date.now()});
			const currentPosition = await queueModel.countDocuments({}).session(session).exec();
			await session.commitTransaction();
			session.endSession();

			// Position can be inferred later when required.
			return {status: 'Queue', position: currentPosition};
		}
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		throw error;
	}
}

async function dequeueUserLogic(userId: string) {
	//DEQUEUE USER
	// Return pos 0 if not in queue, else pos > 0.
	const deletedUser = await queueModel.findOneAndDelete({userId: userId});
	if (!deletedUser) {
		return {status: 'User not in queue', position: 0};
	}

	// Notify the next user in line, if any
	const usersToUpdate = await queueModel.find({joinedAt: {$gt: deletedUser.joinedAt}});
	usersToUpdate.forEach((user) => {
		pubsub.publish('USER_LEFT_QUEUE', {message: `User: ${user.userId} left queue`, timestamp: Date.now()});
	});

	return {status: 'User left from queue', position: 0};
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
			if (!userId) {
				throw new GraphQLError('Not authorized');
			}

			const userInQueue = await queueModel.findOne({userId});
			if (!userInQueue) {
				return {status: 'Not in Queue', position: 0};
			}

			const position = await queueModel.countDocuments({joinedAt: {$lt: userInQueue.joinedAt}});
			return {status: 'In queue', position: position + 1};
		},
	},
	Mutation: {
		initiateChat: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			if (!userId) {
				throw new GraphQLError('Not authorized');
			}
			return initiateChatLogic(userId);
		},
		dequeueUser: async (_parent: unknown, args: {token: string}) => {
			const userId = authUser(args.token);
			if (!userId) {
				throw new GraphQLError('Not authorized');
			}
			return dequeueUserLogic(userId);
		},
	},
	Subscription: {
		queuePositionUpdated: {
			subscribe: withFilter(
				() => pubsub.asyncIterator(['USER_LEFT_QUEUE', 'USER_JOINED_QUEUE']),
				(payload, variables) => {
					return payload.userId.toString() === variables.userId;
				},
			),
		},
	},
};
