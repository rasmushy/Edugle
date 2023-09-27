import {Document} from 'mongoose';

interface User extends Document {
    _id: string;
    username: string;
    email: string;
    password: string;
    description?: string;
    avatar?: string;
}

export {User};
