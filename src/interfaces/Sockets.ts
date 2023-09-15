interface ServerToClientEvents {
	newUser: (message: string) => void;
	newMessage: (message: string) => void;
}

interface ClientToServerEvents {
	update: (animalOrSpecies: string) => void;
}

interface InterServerEvents {
	ping: () => void;
}

export {ServerToClientEvents, ClientToServerEvents, InterServerEvents};
