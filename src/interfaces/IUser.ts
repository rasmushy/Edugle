export interface IUser {
	_id: string;
	name: string;
	email: string;
	password: string;
	role: string;
	lastLogin: Date;
}

export interface IUserInputDTO {
	name: string;
	email: string;
	password: string;
}

export interface IUserIdWithToken {
	id: string;
	token: string;
}
