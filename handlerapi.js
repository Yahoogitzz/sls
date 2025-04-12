// const db = require("./db");
// const {
//     GetItemCommand,
//     PutItemCommand,
//     DeleteItemCommand,
//     ScanCommand,
//     UpdateItemCommand,
// } = require("@aws-sdk/client-dynamodb");
// const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// const getPost = async (event) => {
//     const response = { statusCode: 200 };

//     try {
//         const params = {
//             TableName: process.env.DYNAMODB_TABLE_NAME,
//             Key: marshall({ postId: event.pathParameters.postId }),
//         };
//         const { Item } = await db.send(new GetItemCommand(params));

//         console.log({ Item });
//         response.body = JSON.stringify({
//             message: "Successfully retrieved post.",
//             data: (Item) ? unmarshall(Item) : {},
//             rawData: Item,
//         });
//     } catch (e) {
//         console.error(e);
//         response.statusCode = 500;
//         response.body = JSON.stringify({
//             message: "Failed to get post.",
//             errorMsg: e.message,
//             errorStack: e.stack,
//         });
//     }

//     return response;
// };

// const createPost = async (event) => {
//     const response = { statusCode: 200 };

//     try {
//         const body = JSON.parse(event.body);
//         const params = {
//             TableName: process.env.DYNAMODB_TABLE_NAME,
//             Item: marshall(body || {}),
//         };
//         const createResult = await db.send(new PutItemCommand(params));

//         response.body = JSON.stringify({
//             message: "Successfully created post.",
//             createResult,
//         });
//     } catch (e) {
//         console.error(e);
//         response.statusCode = 500;
//         response.body = JSON.stringify({
//             message: "Failed to create post.",
//             errorMsg: e.message,
//             errorStack: e.stack,
//         });
//     }

//     return response;
// };

// const updatePost = async (event) => {
//     const response = { statusCode: 200 };

//     try {
//         const body = JSON.parse(event.body);
//         const objKeys = Object.keys(body);
//         const params = {
//             TableName: process.env.DYNAMODB_TABLE_NAME,
//             Key: marshall({ postId: event.pathParameters.postId }),
//             UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
//             ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
//                 ...acc,
//                 [`#key${index}`]: key,
//             }), {}),
//             ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
//                 ...acc,
//                 [`:value${index}`]: body[key],
//             }), {})),
//         };
//         const updateResult = await db.send(new UpdateItemCommand(params));

//         response.body = JSON.stringify({
//             message: "Successfully updated post.",
//             updateResult,
//         });
//     } catch (e) {
//         console.error(e);
//         response.statusCode = 500;
//         response.body = JSON.stringify({
//             message: "Failed to update post.",
//             errorMsg: e.message,
//             errorStack: e.stack,
//         });
//     }

//     return response;
// };

// const deletePost = async (event) => {
//     const response = { statusCode: 200 };

//     try {
//         const params = {
//             TableName: process.env.DYNAMODB_TABLE_NAME,
//             Key: marshall({ postId: event.pathParameters.postId }),
//         };
//         const deleteResult = await db.send(new DeleteItemCommand(params));

//         response.body = JSON.stringify({
//             message: "Successfully deleted post.",
//             deleteResult,
//         });
//     } catch (e) {
//         console.error(e);
//         response.statusCode = 500;
//         response.body = JSON.stringify({
//             message: "Failed to delete post.",
//             errorMsg: e.message,
//             errorStack: e.stack,
//         });
//     }

//     return response;
// };

// const getAllPosts = async () => {
//     const response = { statusCode: 200 };

//     try {
//         const { Items } = await db.send(new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME }));

//         response.body = JSON.stringify({
//             message: "Successfully retrieved all posts.",
//             data: Items.map((item) => unmarshall(item)),
//             Items,
//         });
//     } catch (e) {
//         console.error(e);
//         response.statusCode = 500;
//         response.body = JSON.stringify({
//             message: "Failed to retrieve posts.",
//             errorMsg: e.message,
//             errorStack: e.stack,
//         });
//     }

//     return response;
// };

// module.exports = {
//     getPost,
//     createPost,
//     updatePost,
//     deletePost,
//     getAllPosts,
// };

const db = require("./db");
const {
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// Helper: format success & error responses
const formatResponse = (statusCode, message, data = {}, error = null) => {
  return {
    statusCode,
    body: JSON.stringify({
      message,
      ...(error && { error }),
      ...(data && { data }),
    }),
  };
};

// Helper: parse input safely
const safeParse = (input) => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

// ✅ GET a single post by postId
const getPost = async (event) => {
  const postId = event?.pathParameters?.postId;

  if (!postId) {
    return formatResponse(400, "Missing postId in path.");
  }

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ postId }),
    };

    const { Item } = await db.send(new GetItemCommand(params));
    return formatResponse(200, "Post retrieved.", {
      post: Item ? unmarshall(Item) : null,
      rawData: Item,
    });
  } catch (err) {
    return formatResponse(500, "Error retrieving post.", null, err.message);
  }
};

// ✅ CREATE a new post
const createPost = async (event) => {
  const body = safeParse(event.body);
  if (!body || !body.postId || !body.title) {
    return formatResponse(400, "Missing required post fields.");
  }

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(body),
    };

    const result = await db.send(new PutItemCommand(params));
    return formatResponse(201, "Post created successfully.", { result });
  } catch (err) {
    return formatResponse(500, "Error creating post.", null, err.message);
  }
};

// ✅ UPDATE a post by ID
const updatePost = async (event) => {
  const postId = event?.pathParameters?.postId;
  const body = safeParse(event.body);

  if (!postId || !body || Object.keys(body).length === 0) {
    return formatResponse(400, "Invalid update request.");
  }

  const keys = Object.keys(body);
  const UpdateExpression = `SET ${keys.map((_, i) => `#k${i} = :v${i}`).join(", ")}`;
  const ExpressionAttributeNames = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
  const ExpressionAttributeValues = marshall(
    Object.fromEntries(keys.map((k, i) => [`:v${i}`, body[k]]))
  );

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ postId }),
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };

    const result = await db.send(new UpdateItemCommand(params));
    return formatResponse(200, "Post updated successfully.", { result });
  } catch (err) {
    return formatResponse(500, "Error updating post.", null, err.message);
  }
};

// ✅ DELETE a post
const deletePost = async (event) => {
  const postId = event?.pathParameters?.postId;
  if (!postId) return formatResponse(400, "Missing postId.");

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ postId }),
    };

    const result = await db.send(new DeleteItemCommand(params));
    return formatResponse(200, "Post deleted successfully.", { result });
  } catch (err) {
    return formatResponse(500, "Error deleting post.", null, err.message);
  }
};

// ✅ GET all posts
const getAllPosts = async () => {
  try {
    const { Items } = await db.send(
      new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME })
    );

    const posts = Items.map((item) => unmarshall(item));
    return formatResponse(200, "All posts retrieved.", { posts });
  } catch (err) {
    return formatResponse(500, "Failed to get posts.", null, err.message);
  }
};

module.exports = {
  getPost,
  createPost,
  updatePost,
  deletePost,
  getAllPosts,
};
