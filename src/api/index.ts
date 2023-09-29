import express from 'express';

import userRoute from './routes/userRoute';
import authRoute from './routes/authRoute';
import MessageResponse from '../interfaces/MessageResponse';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
	res.json({
		message: 'routes: users, auth',
	});
});

router.use('/auth', authRoute);
router.use('/users', userRoute);

export default router;
