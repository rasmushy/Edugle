require('dotenv');
import jwt from 'jsonwebtoken';

const authUser = (token: string) => {
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {id: string};
		return decoded.id;
	} catch (err) {
		return null;
	}
};

export default authUser;
