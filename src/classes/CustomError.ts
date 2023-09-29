export default class CustomError extends Error {
	status = 400;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
		Object.setPrototypeOf(this, CustomError.prototype);
	}
}
