const express = require("express");
const Post = require("../models/posts");
const User = require("../models/users");
const Comment = require("../models/comments");
const mongoose = require("mongoose");
const { verifyToken } = require("../middlewares/auth");
const { validateID } = require("../utils/utils");
const route = express.Router();

//obtiene todos los comentarios
route.get("/", (req, res) => {
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.from) || 25;
  const sortCriteria = req.query.sortCriteria || "createdAt";

  Comment.find()
    .sort({ [sortCriteria]: "asc" })
    .skip(from)
    .limit(limit)
    .then((dbComments) => {
      return res.json({
        ok: true,
        comments: dbComments,
      });
    })
    .catch((err) => {
      res.status(500).json({
        ok: false,
        err,
      });
    });
});

//obtiene los comentarios que no son respuestas a otros comentarios
route.get("/:postId", (req, res) => {
  const postId = req.params.postId;
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.from) || 25;
  const sortCriteria = req.query.sortCriteria || "createdAt";
  const sortOrder = !req.query.sortOrder? "asc" : req.query.sortOrder;  

  if (validateID(postId)) {
    Comment.find({ post: postId, repliedTo: null })
      .sort({ [sortCriteria]: sortOrder })
      .skip(from)
      .limit(limit)
      .populate({
        path: "user",
        select: "username profilePicture",
      })
      .then((dbComments) => {
        return res.json({
          ok: true,
          comments: dbComments,
        });
      })
      .catch((err) => {
        res.status(500).json({
          ok: false,
          err,
        });
      });
  } else {
    return res.status(400).json({
      ok: false,
      err: "Post invalido",
    });
  }
});

//obtiene los comentarios que son respuestas a otros comentarios de un mismo post
route.get("/:postId/:targetCommentId", (req, res) => {
  const { postId, targetCommentId } = req.params;
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.from) || 25;

  if (validateID(postId) && validateID(targetCommentId)) {
    Comment.find({ post: postId, repliedTo: targetCommentId })
      .skip(from)
      .limit(limit)
      .populate({
        path: "user repliedTo",
        select: "username profilePicture user",
        populate: {
          path: "user",
          select: "username",
        },
      })
      .then((dbComments) => {
        res.json({
          ok: true,
          comments: dbComments,
        });
      })
      .catch((err) => {
        res.status(500).json({
          ok: false,
          err,
        });
      });
  } else {
    res.status(400).json({
      ok: false,
      err: "Post invalido o comentario invalido",
    });
  }
});

//publicar comentario
route.post("/:postId", verifyToken, (req, res) => {
  const postId = req.params.postId;
  const { content } = req.body;

  if (validateID(postId)) {
    let comment = new Comment({
      post: mongoose.Types.ObjectId(postId),
      user: req.user._id,
      content,
    });

    comment
      .save()
      .then(() => {
        return res.json({
          ok: true,
          comment,
          message: "Comentario publicado!!!",
        });
      })
      .catch((err) => {
        res.status(400).json({
          ok: false,
          err,
        });
      });
  } else {
    res.status(400).json({
      ok: false,
      err: "Post invalido",
    });
  }
});

//publicar respuesta a otro comentario
route.post("/:postId/:commentId", verifyToken, (req, res) => {
  const { postId, commentId } = req.params;
  const { content } = req.body;

  if (validateID(postId) && validateID(commentId)) {
    Comment.findById(commentId)
      .populate({
        path: "user",
      })
      .then((targetComment) => {
        let replyComment = new Comment({
          post: mongoose.Types.ObjectId(postId),
          user: req.user._id,
          content,
          repliedTo: mongoose.Types.ObjectId(commentId),
        });

        return replyComment.save();
      })
      .then((replyComment) => {
        return res.json({
          ok: true,
          comment: replyComment,
          message: "respuesta publicado!!!",
        });
      })
      .catch((err) => {
        res.status(400).json({
          ok: false,
          err,
        });
      });
  } else {
    res.status(400).json({
      ok: false,
      err: "Post invalido",
    });
  }
});

module.exports = route;
