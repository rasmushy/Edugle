interface ServerToClientEvents {
	addUser: (message: string) => void;
	addMessage: (message: string) => void;
}

interface ClientToServerEvents {
	update: (message: string) => void;
}

export type {ServerToClientEvents, ClientToServerEvents};
