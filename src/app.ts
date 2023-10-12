require('dotenv').config();
import express from 'express';
import cors from 'cors';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import typeDefs from './api/schemas';
import resolvers from './api/resolvers';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import {notFound, errorHandler} from './middlewares';
import authenticate from './functions/authenticate';
import {IContext} from './interfaces/IContext';
import {createRateLimitRule} from 'graphql-rate-limit';
import {shield} from 'graphql-shield';
import {applyMiddleware} from 'graphql-middleware';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {createServer} from 'http';
import {useServer} from 'graphql-ws/lib/use/ws';
import {WebSocketServer} from 'ws';
import api from './api';

const app = express();
const httpServer = createServer(app);
app.use(express.json());

const wsServer = new WebSocketServer({
	server: httpServer,
	path: '/subscriptions',
});

(async () => {
	try {
		const rateLimitRule = createRateLimitRule({
			identifyContext: (ctx) => ctx.id,
		});

		const permissions = shield({
			Mutation: {
				loginUser: rateLimitRule({window: '1s', max: 5}),
				initiateChat: rateLimitRule({window: '1s', max: 5}),
			},
		});

		const schema = applyMiddleware(
			makeExecutableSchema({
				typeDefs,
				resolvers,
			}),
			permissions,
		);

		const serverCleanup = useServer(
			{
				schema,
				onConnect: (ctx) => {
					console.log('client connected');
				},
				onSubscribe: (ctx, msg) => {
					console.log('client subscribed');
				},
				onDisconnect: (ctx, code, reason) => {
					console.log('client disconnected');
				},
				onClose: (ctx, code, reason) => {
					console.log('client closed');
				}
			},
			wsServer,
		);

		const server = new ApolloServer<IContext>({
			schema,
			introspection: true,
			plugins: [
				ApolloServerPluginDrainHttpServer({httpServer}),
				// Proper shutdown for the WebSocket server.
				{
					async serverWillStart() {
						return {
							async drainServer() {
								await serverCleanup.dispose();
							},
						};
					},
				},
			],
			formatError: (formattedError, data) => {
				console.log(formattedError);
				return formattedError;
			},
			includeStacktraceInErrorResponses: false,
		});

		await server.start();
		app.use(
			'/graphql',
			express.json(),
			cors<cors.CorsRequest>(),
			expressMiddleware(server, {
				context: async ({req, res}) => {
					return {req: authenticate(req), res: res};
				},
			}),
		);

		const PORT = process.env.PORT || 4000;
		// Now that our HTTP server is fully set up, we can listen to it.
		httpServer.listen(PORT, () => {
			console.log(`Server is now running on http://localhost:${PORT}/graphql`);
		});
		app.use('/api', api);
		app.use(notFound);
		app.use(errorHandler);
	} catch (error) {
		console.log(error);
	}
})();

export default app;
