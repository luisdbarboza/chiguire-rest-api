const express = require("express");
const path = require("path");
const multer = require("multer");
const util = require("util");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const Post = require("../models/posts");
const Category = require("../models/categories");
const { verifyToken, verifyAdminRole } = require("../middlewares/auth");
const {
  validateID,
  validateImage,
  deleteFile,
  generateUniqueFilename,
} = require("../utils/utils");

const route = express.Router();

const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const nameArray = file.originalname.split(".");
    const extension = nameArray[nameArray.length - 1];
    const filename = generateUniqueFilename(uuidv4(), extension);

    cb(null, filename);
  },
  destination: path.join(__dirname, "../../uploads/posts"),
});

route.get("/", (req, res) => {
  const type = req.query.type;
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.limit) || 5;

  if (!type) {
    Post.find(
      {},
      "title referentialImage description author createdAt highlight comments category"
    )
      .skip(from)
      .limit(limit)
      .populate({
        path: "author category",
        select: "username name",
      })
      .then((dbPosts) => {
        Post.count({})
          .then((numberOfPosts) => {
            return res.json({
              ok: true,
              posts: dbPosts,
              numberOfPosts,
            });
          })
          .catch((err) => {
            res.status(400).json({
              ok: false,
              err,
            });
          });
      })
      .catch((err) => {
        res.status(400).json({
          ok: false,
          err,
        });
      });
  } else if (type === "best-posts") {
    Post.find({}, "title referentialImage clickedTimes comments")
      .sort({ clickedTimes: "desc" })
      .limit(limit)
      .then((dbPosts) => {
        return res.json({
          ok: true,
          posts: dbPosts,
        });
      })
      .catch((err) => {
        res.status(400).json({
          ok: false,
          err,
        });
      });
  }
});

//Obtiene toda la informacion de un Post excepto los comentarios
route.get("/:id", (req, res) => {
  const id = req.params.id;

  Post.findOne(
    { _id: id },
    "_id title author description referentialImage createdAt content category clickedTimes comments numberOfComments"
  )
    .populate({
      path: "author category",
      select: "username name",
    })
    .then((dbPost) => {
      return res.json({
        ok: true,
        post: dbPost,
      });
    })
    .catch((err) => {
      res.status(400).json({
        ok: false,
        err,
      });
    });
});

route.get("/search/:term", (req, res) => {
  const term = req.params.term;
  let regex = new RegExp(term, "i");

  Post.find({ title: regex })
    .select("title referentialImage description createdAt comments")
    .then((dbPosts) => {
      return res.json({
        ok: true,
        posts: dbPosts,
      });
    })
    .catch((err) => {
      res.status(400).json({
        ok: false,
        err,
      });
    });
});

route.post(
  "/",
  multer({
    storage,
  }).single("referentialImage"),
  async (req, res) => {
    const body = req.body;
    const unlink = util.promisify(fs.unlink);
    let result;

    if (req.file) {
      const referentialImage = {
        file: null,
        path: null,
        name: null,
        extension: null,
      };

      let isImageValid = validateImage(req, referentialImage);

      if (process.env.NODE_ENV === "produccion") {
        result = await cloudinary.v2.uploader.upload(req.file.path);
      }

      if (isImageValid !== true) {
        return res.status(400).json(isImageValid);
      }

      body.referentialImage =
        process.env.NODE_ENV === "produccion" ? result.url : req.file.filename;

      body.referentialImagePublicID =
        process.env.NODE_ENV === "produccion" ? result.public_id : null;

      if (process.env.NODE_ENV === "produccion") {
        unlink(req.file.path)
          .then(() => {
            savePost(res, body);
          })
          .catch((err) => {
            res.status(500).json({
              ok: false,
              err,
            });
          });
      } else {
        savePost(res, body);
      }
    }
  }
);

route.put(
  "/:id",
  [
    verifyToken,
    verifyAdminRole,
    multer({
      storage,
    }).single("referentialImage"),
  ],
  async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    const unlink = util.promisify(fs.unlink);
    let result;

    if (process.env.NODE_ENV === "produccion") {
      result = await cloudinary.v2.uploader.upload(req.file.path);
    }

    if (validateID(id)) {
      if (req.file) {
        const referentialImage = {
          file: null,
          path: null,
          name: null,
          extension: null,
        };

        let isImageValid = validateImage(req, referentialImage);

        if (isImageValid !== true) {
          return res.status(400).json(isImageValid);
        }

        body.referentialImage =
          process.env.NODE_ENV === "produccion"
            ? result.url
            : req.file.filename;

        body.referentialImagePublicID =
          process.env.NODE_ENV === "produccion" ? result.public_id : null;

        if (process.env.NODE_ENV === "produccion") {
          unlink(req.file.path)
            .then(() => {
              updatePost(res, id, body, true);
            })
            .catch((err) => {
              res.status(500).json({
                ok: false,
                err,
              });
            });
        } else {
          updatePost(res, id, body, true);
        }
      } else {
        updatePost(res, id, body);
      }
    } else {
      res.status(400).json({
        ok: false,
        err: "Post invalido",
      });
    }
  }
);

route.put("/clicksUpdate/:postId", (req, res) => {
  const postId = req.params.postId;

  if (validateID(postId)) {
    Post.findById(postId)
      .then((dbPost) => {
        return Post.update({ _id: postId }, { $inc: { clickedTimes: 1 } }).then(
          () =>
            Category.update(
              { _id: dbPost.category },
              { $inc: { clickedTimes: 1 } }
            )
        );
      })
      .then(() =>
        res.json({
          ok: true,
          message: "Post actualizado",
        })
      )
      .catch((err) => {
        return res.status(500).json({
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

route.delete("/:id", [verifyToken, verifyAdminRole], (req, res) => {
  const id = req.params.id;

  if (validateID(id)) {
    Post.findOne({ _id: id })
      .then((dbPost) => {
        if (!dbPost) throw Error("Post inexistente");

        if (
          process.env.NODE_ENV === "produccion" &&
          dbPost.referentialImagePublicID
        ) {
          cloudinary.v2.api.delete_resources(
            [dbPost.referentialImagePublicID],
            (error, result) => {
              console.log(result, error);
            }
          );
        } else {
          if (updateFile && dbPost.referentialImage !== "") {
            deleteFile("posts", dbPost.referentialImage);
          }
        }

        dbPost.remove().then(() => {
          return res.json({
            ok: true,
            message: "Post borrado",
          });
        });
      })
      .catch((err) => {
        res.json({
          ok: false,
          err: err.message,
        });
      });
  } else {
    res.status(400).json({
      ok: false,
      err: "Post invalido",
    });
  }
});

const savePost = (res, body) => {
  let post = new Post({
    title: body.title,
    createdAt: body.createdAt,
    content: body.content,
    author: body.author,
    description: body.description,
    referentialImage: body.referentialImage,
    referentialImagePublicID:
      process.env.NODE_ENV === "produccion"
        ? body.referentialImagePublicID
        : null,
    category: body.category,
  });

  Category.findById(post.category)
    .then((dbCategory) => {
      if (!dbCategory) throw new Error("Categoria inexistente!!!").message;

      return post.save();
    })
    .then(() => Post.findById(post._id))
    .then((dbPost) => {
      return res.json({
        ok: true,
        post: dbPost,
      });
    })
    .catch((err) => {
      res.status(400).json({
        ok: false,
        err,
      });
    });
};

const updatePost = (res, id, body, updateFile = false) => {
  Post.findById(id)
    .then((dbPost) => {
      if (!dbPost) throw Error("Post no existe");

      if (process.env.NODE_ENV === "produccion") {
        cloudinary.v2.api.delete_resources(
          [dbPost.referentialImagePublicID],
          (error, result) => {
            console.log(result, error);
          }
        );
      } else {
        if (updateFile && dbPost.referentialImage !== "") {
          deleteFile("posts", dbPost.referentialImage);
        }
      }

      Post.updateOne({ _id: dbPost._id }, body)
        .then(() => Post.findById(id))
        .then((dbPost) => {
          return res.json({
            ok: true,
            post: dbPost,
          });
        });
    })
    .catch((err) => {
      if (updateFile && process.env.NODE_ENV !== "produccion") {//dejar asi
        deleteFile("posts", body.referentialImage);
      }

      res.status(400).json({
        ok: false,
        err,
      });
    });
};

module.exports = route;
