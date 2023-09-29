require('dotenv').config();
import express from 'express';
import cors from 'cors';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import typeDefs from './api/schemas';
import resolvers from './api/resolvers';
import {ApolloServerPluginLandingPageProductionDefault, ApolloServerPluginLandingPageLocalDefault} from '@apollo/server/plugin/landingPage/default';
import {notFound, errorHandler} from './middlewares';
import authenticate from './functions/authenticate';
import {IContext} from './interfaces/IContext';
import {createRateLimitRule} from 'graphql-rate-limit';
import {shield} from 'graphql-shield';
import {applyMiddleware} from 'graphql-middleware';
import {makeExecutableSchema} from '@graphql-tools/schema';
import MessageResponse from './interfaces/MessageResponse';
import api from './api';

const app = express();
app.use(express.json());

(async () => {
	try {
		const rateLimitRule = createRateLimitRule({
			identifyContext: (ctx) => ctx.id,
		});

		const permissions = shield({
			Mutation: {
				loginUser: rateLimitRule({window: '1s', max: 5}),
			},
		});

		const schema = applyMiddleware(
			makeExecutableSchema({
				typeDefs,
				resolvers,
			}),
			permissions
		);

		const server = new ApolloServer<IContext>({
			schema,
			introspection: true,
			plugins: [
				process.env.NODE_ENV === 'production'
					? ApolloServerPluginLandingPageProductionDefault({
							embed: true as false,
					  })
					: ApolloServerPluginLandingPageLocalDefault(),
			],
			includeStacktraceInErrorResponses: false,
		});
		await server.start();

		app.use(
			'/graphql',
			express.json(),
			cors<cors.CorsRequest>(),
			expressMiddleware(server, {
				context: async ({req}) => authenticate(req),
			})
		);
		app.use('/api', api);
		app.use(notFound);
		app.use(errorHandler);
	} catch (error) {
		console.log(error);
	}
})();

export default app;
