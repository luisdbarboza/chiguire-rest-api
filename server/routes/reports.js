const express = require("express");
const Post = require("../models/posts");
const User = require("../models/users");
const Comment = require("../models/comments");
const Category = require("../models/categories");
const Tag = require("../models/tags");

const route = express.Router();

route.get("/", (req, res) => {
  const type = req.query.type;

  switch (type) {
    case "data-count-query":
      const query1 = Post.count({});
      const query2 = User.count({});
      const query3 = Category.count({});
      const query4 = Comment.count({});
      const query5 = Tag.count({});

      Promise.all([query1, query2, query3, query4, query5])
        .then((results) => {
          res.json({
            ok: true,
            posts: results[0],
            users: results[1],
            categories: results[2],
            comments: results[3],
            tags: results[4],
          });
        })
        .catch((err) => {
          res.status(500).json({
            ok: false,
            err,
          });
        });
      break;
    default:
      return res.status(400).json({
        ok: false,
        message: "Solucitud invalida",
      });
  }
});

module.exports = route;
