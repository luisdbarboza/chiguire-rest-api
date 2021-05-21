const express = require("express");
const Tag = require("../models/tags");
const Post = require("../models/posts");

const route = express.Router();

route.get("/", (req, res) => {
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.limit) || 25;

  Tag.find({})
    .skip(from)
    .limit(limit)
    .populate({
      path: "posts",
      select: "title description author referentialImage createdAt comments",
    })
    .then((dbTags) => {
      return res.json({
        ok: true,
        tags: dbTags,
      });
    })
    .catch((err) => {
      res.json({
        ok: false,
        err,
      });
    });
});

route.get("/:tagId", (req, res) => {
  const tagId = req.params.tagId;

  Tag.findById(tagId)
    .populate({
      path: "posts",
      select: "title description author referentialImage createdAt comments",
    })
    .then((dbTag) => {
      return res.json({
        ok: true,
        tag: dbTag,
      });
    })
    .catch((err) => {
      res.json({
        ok: false,
        err,
      });
    });
});

route.post("/", (req, res) => {
  const name = req.body.name;

  let tag = new Tag({
    name,
  });

  tag
    .save()
    .then((dbTag) => {
      return res.json({
        ok: true,
        tag: dbTag,
      });
    })
    .catch((err) => {
      res.status(500).json({
        ok: false,
        err,
      });
    });
});

route.put("/:tagId/:postId", (req, res) => {
  const { tagId, postId } = req.params;

  Tag.findById(tagId)
    .then((dbTag) => {
      dbTag.posts.push(postId);

      return dbTag.save();
    })
    .then(() => {
      return Post.updateOne({_id: postId}, {$push: {tags: tagId}})
    })
    .then(() => {
      return res.json({
        ok: true,
        message: "Post agregado al tag",
      });
    })
    .catch((err) => {
      res.status(400).json({
        ok: false,
        err,
      });
    });
});

route.delete("/:tagId", (req, res) => {
  const tagId = req.params.tagId;

  Tag.remove({ _id: tagId })
    .then(() => {
      return Post.updateMany({tags: tagId}, {$pull: {tags: tagId}});
    })
    .then(() => {
      return res.json({
        ok: true,
        message: "Tag borrada",
      });
    })
    .catch((err) => {
      res.status(400).json({
        ok: false,
        err,
      });
    });
});

module.exports = route;
