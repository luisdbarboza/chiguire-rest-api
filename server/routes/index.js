const express = require("express");
const route = express.Router();

route.use("/users", require("./users"));
route.use("/comments", require("./comments"));
route.use("/categories", require("./categories"));
route.use("/tags", require("./tags"));
route.use("/posts", require("./posts"));
route.use("/login", require("./login"));
route.use("/images", require("./images"));
route.use("/reports", require("./reports"));

module.exports = route;