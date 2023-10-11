export interface IUser {
	id: string;
	username: string;
	email: string;
	password: string;
	role: string;
	lastLogin: Date;
}

export interface IUserInputDTO {
	username: string;
	email: string;
	password: string;
}

export interface IUserIdWithToken {
	id: string;
	token: string;
	role: string;
}
