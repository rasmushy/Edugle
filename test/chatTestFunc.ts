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
            mutation CreateChat($chat: ChatInput!, $user: UserWithTokenInput!) {
                createChat(chat: $chat, user: $user) {
                  id
              }
              
            `,
                variables: {
                    chat: {
                        created_date: 1,
                        users: userData.user.id
                    },
                    user: {
                        token: userData.token
                    }
                    }
            })
            .expect(200, (err, res) => {
                if (err) {
                    reject(err);
                }
                const chat = res.body;
                console.log('chat', chat)
                // expect(chat).toHaveProperty('id');
                // expect(chat).toHaveProperty('date');
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
                    }
            `,
                variables: {
                deleteChatAsAdminId: chat.id,
                    admin: {
                        id: adminUserData.user.id,
                        role: adminUserData.user.role,
                        token: adminUserData.token
                    }
                }   
            })
            .expect(200, (err, res) => {
                if (err) {
                    reject(err);
                }
                const chat = res.body;
                console.log('chat', chat)
                // expect(chat).toHaveProperty('message');
                resolve(chat);
            });
    });
}

export {createChat, deleteChat};
