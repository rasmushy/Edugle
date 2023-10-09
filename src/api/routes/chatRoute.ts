import express from 'express';
import {initiateChat} from '../controllers/chatController';
import {authenticate} from '../../middlewares';
import {body} from 'express-validator';

const router = express.Router();

router.route('/').post(authenticate, body('users').escape(), initiateChat);
