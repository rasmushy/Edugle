import request from 'supertest';
import {UserTest} from '../src/interfaces/User';
import LoginMessageResponse from '../src/interfaces/LoginMessageResponse';
import { ChatTest } from '../src/interfaces/Chat';

const createChat = async (url: string | Function, userData: LoginMessageResponse, userData2: LoginMessageResponse) => {
    return new Promise((resolve, reject) => {
        request(url)
            .post('/graphql')
            .set('Content-type', 'application/json')
            .send({
                query: `
            mutation CreateChat($chat: CreateChatInput) {
                        createChat(chat: $chat) {
                            id
                            created_date
                            users {
                            id
                            username
                            email
                            description
                            avatar
                            lastLogin
                            }
                            messages {
                            id
                            date
                            content
                            sender {
                                id
                                username
                                email
                                password
                                description
                                avatar
                                lastLogin
                                role
                            }
                            }
                        }
                        }

            `,
                variables: {
                    chat: {
                        users: [userData.user.id, userData2.user.id]
                    },

                    }
            })
            .expect(200, (err, res) => {
                if (err) {
                    reject(err);
                }
                const chat = res.body.data.createChat;
                expect(chat).toHaveProperty('id');
                expect(chat).toHaveProperty('created_date');
                expect(chat).toHaveProperty('users');
                resolve(chat);
            });
    });
};

const deleteChat = async (url: string | Function, adminUserData: LoginMessageResponse, chat: ChatTest) => {
    return new Promise((resolve, reject) => {
        request(url)
            .post('/graphql')
            .set('Content-type', 'application/json')
            .send({
                query: `
                    mutation DeleteChatAsAdmin($deleteChatAsAdminId: ID!, $admin: AdminWithTokenInput) {
                        deleteChatAsAdmin(id: $deleteChatAsAdminId, admin: $admin) {
                            id
                            created_date
                            users {
                            id
                            username
                            email
                            description
                            avatar
                            lastLogin
                            }
                            messages {
                            id
                            date
                            content
                            sender {
                                id
                                username
                                email
                                password
                                description
                                avatar
                                lastLogin
                                role
                            }
                            }
                        }
                        }
            `,
                variables: {
                    deleteChatAsAdminId: chat.id,
                    token: adminUserData.token
                }   
            })
            .expect(200, (err, res) => {
                if (err) {
                    reject(err);
                }
                const chat = res.body.data;
                console.log('chat', chat)
                expect(chat).toHaveProperty('id');
                expect(chat).toHaveProperty('created_date');
                expect(chat).toHaveProperty('users');
                resolve(chat);
            });
    });
}

export {createChat, deleteChat};
