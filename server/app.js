const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolvers = require("./graphql/resolvers");
const auth = require("./middleware/auth");
const multer = require("multer");
const cors = require("cors");
const PORT = process.env.PORT || 8080;
const { fileStorage, fileFilter, clearImage } = require("./helpers/multer");

const app = express();

app.use(express.json({ limit: "50mb" })); // Allow us to handle raw json
app.use(express.urlencoded({ limit: "50mb", extended: false })); // Allow us to handle form submissions to handle URL encoded data

app.use(cors());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(auth);

app.use("/images", express.static(path.join(__dirname, "images")));

app.put(
  "/post-image",
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"),
  (req, res, next) => {
    try {
      if (!req.isAuth) {
        const error = new Error("Authorization failed!!");
        error.statusCode = 401;
        throw error;
      }

      if (!req.file) {
        const error = new Error("No image provided!!");
        error.statusCode = 422;
        throw error;
      }

      if (req.body.oldPath) {
        clearImage(req.body.oldPath);
      }

      return res
        .status(200)
        .json({ message: "File stored!!", filePath: req.file.path });
    } catch (error) {
      console.log(error);
      return next(error);
    }
  }
);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolvers,
    graphiql: true, // you can open tools
    customFormatErrorFn: (error) => {
      return {
        message: error.message,
        locations: error.locations,
        stack: error.stack ? error.stack.split("\n") : [],
        path: error.path,
      };
    },
  })
);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    "mongodb+srv://kietcao:thangcho@cluster0.kfugn.mongodb.net/graphql?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    app.listen(PORT);
    console.log(`Server is running on port ${PORT}`);
  })
  .catch((err) => console.log(err));
