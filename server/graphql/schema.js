const { buildSchema } = require("graphql");

module.exports = buildSchema(`
  type AuthData {
    token: String!
    userId: String!
  }

  type PostData {
    posts: [Post!]
    totalPosts: Int!
  }

  type RootQuery {
    login(email: String!, password: String!) : AuthData!
    getPosts(page: Int!): PostData!
  }

  type Post {
    _id: String!
    title: String!
    imageUrl: String!
    content: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    _id: String!
    email: String!
    name: String!
    password: String!
    status: String
    posts: [Post]
  }

  input UserInputData {
    email: String!
    name: String!
    password: String!
  }

  input PostInputData {
    title: String!
    content: String!
    imageUrl: String!
  }

  type RootMutation {
    createUser(userInput: UserInputData) : User!
    createPost(postInput: PostInputData) : Post!
  }
  
  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);
