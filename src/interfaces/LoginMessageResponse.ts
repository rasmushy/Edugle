import {IUser} from './IUser';

export default interface LoginMessageResponse {
	token?: string;
	message: string;
	user: IUser;
}
