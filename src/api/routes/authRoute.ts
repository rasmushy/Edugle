import express from 'express';
import {loginPost} from '../controllers/authController';
import {body} from 'express-validator';

const router = express.Router();

router.route('/login').post(body('email').escape(), body('password').escape(), loginPost);

export default router;
