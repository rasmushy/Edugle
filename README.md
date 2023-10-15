# [Edugle](https://github.com/rasmushy/Edugle-frontend)

This school project aims to create a real-time, text-based chat platform that allows users to engage in conversations within various chat rooms. Built using technologies like GraphQL, Node.js, and a NoSQL database. Chat rooms will be created by site itself and users can change rooms with site navigation. Idea is that you will be randomised into next room with other user.

## Features:

-   Real-time chat
-   User authentication
-   User authorization
-   GraphQL API
-   MongoDB database

## How to run the project locally:

1. Clone the repository
2. Run `npm install` in the root folder
3. Run `npm run dev` in the root folder

## How to run the project in production:

1. Clone the repository
2. Run `npm install` in the root folder
3. Run `npm run build` in the root folder
4. Run `npm start` in the root folder

## How to run the tests:

1. Run `npm test` in the root folder
To run tests you will need to have admin profile manually added to your test database users collection matching like this:
{
username: "admin",
email: "admin@test.fi",
password: "admin"
}
Role needs to be changed to admin! Others collections should be empty!

## Environment variables:

Enviroment example provided in .env.example file. You will need to create your own .env file to run the project.

