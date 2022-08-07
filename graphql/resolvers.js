const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { clearImage } = require("../helpers/multer");

module.exports = {
  createUser: async (args, _req) => {
    const {
      userInput: { email, name, password },
    } = args;
    const user = await User.findOne({ email });

    if (user) {
      const error = new Error("User already exists!");
      error.code = 422;
      throw error;
    }

    const newUser = await User.create({
      email,
      name,
      password: await bcrypt.hash(password, 12),
    });

    return { ...newUser._doc, _id: newUser._id.toString() };
  },
  login: async ({ email, password }, _req) => {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found!!");
      error.code = 401; // Unauthorized response status code
      throw error;
    }

    if (!(await bcrypt.compare(password, user.password))) {
      const error = new Error("Password doesn't match!!");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id,
      },
      "somesupersecretsecret",
      { expiresIn: "1h" }
    );

    return { token, userId: user._id.toString() };
  },
  createPost: async ({ postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User not found!!");
      error.code = 422;
      throw error;
    }

    const newPost = await Post.create({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user, // this is different with saving creator: user._id even though saving in mongodb the same way
    });

    user.posts.push(newPost);
    await user.save();

    return {
      ...newPost._doc,
      _id: newPost._id.toString(),
      createdAt: newPost.createdAt.toISOString(),
      updatedAt: newPost.updatedAt.toISOString(),
    };
  },
  getPosts: async ({ page }, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    const currentPage = page || 1;
    const perPage = 3;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 }) // sorted by descending order
      .skip((currentPage - 1) * perPage) // pagination
      .limit(perPage);

    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },
  updatePost: async ({ postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postInput._id).populate("creator");

    if (req.userId.toString() !== post.creator._id.toString()) {
      const error = new Error("Not Authorized!!");
      error.code = 403;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;
    post.imageUrl = postInput.imageUrl;
    const updatePost = await post.save();

    return {
      ...updatePost._doc,
      _id: updatePost._id.toString(),
      createdAt: updatePost.createdAt.toISOString(),
      updatedAt: updatePost.updatedAt.toISOString(),
    };
  },
  getPost: async ({ postId }, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  deletePost: async ({ postId }, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");

    if (req.userId.toString() !== post.creator._id.toString()) {
      const error = new Error("Not Authorized!!");
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.deleteOne({ _id: postId });

    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    return true;
  },
  getUser: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("No user found!!");
      error.code = 404;
      throw error;
    }

    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async ({ newStatus }, req) => {
    if (!req.isAuth) {
      const error = new Error("Authorization failed!!");
      error.code = 401;
      throw error;
    }

    let user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    user = await user.save();
    return { ...user._doc, _id: user._id.toString() };
  },
};
