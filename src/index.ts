import app from './app';
import mongoConnect from './utils/db';

(async () => {
	try {
		await mongoConnect();
		app;
	} catch (error) {
		console.log('Server error', (error as Error).message);
	}
})();
