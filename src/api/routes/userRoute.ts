import express from 'express';
import {check, checkToken, userDelete, userGet, userListGet, userPost, userPut, userDeleteAsAdmin, userPutAsAdmin, checkAdmin} from '../controllers/userController';
import {authenticate} from '../../middlewares';

const router = express.Router();

router.route('/').get(authenticate, userListGet).post(userPost).put(authenticate, userPut).delete(authenticate, userDelete, userDeleteAsAdmin);

router.get('/token', authenticate, checkToken);

router.get('/auth', authenticate, checkAdmin);

router.route('/check').get(check);

router.route('/:id').get(userGet).delete(authenticate, userDeleteAsAdmin).put(authenticate, userPutAsAdmin);

export default router;
