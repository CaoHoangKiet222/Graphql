const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Bearer ") === -1
  ) {
    req.isAuth = false;
    return next();
  }
  const token = req.headers.authorization.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, "somesupersecretsecret");
  } catch (err) {
    req.isAuth = false;
    return next();
  }
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }

  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
  //https://stackoverflow.com/questions/16810449/when-to-use-next-and-return-next-in-node-js
};
