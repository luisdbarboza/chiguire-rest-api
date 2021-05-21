const express = require("express");
const Category = require("../models/categories");

const route = express.Router();

route.get("/", (req, res) => {
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.limit) || 25;
  const onlyField = req.query.onlyField || null;

  const query =
    onlyField === null
      ? Category.find({}).populate({
          path: "posts",
          select:
            "title description author referentialImage createdAt comments",
        })
      : Category.find({}).select(`${onlyField}`);

  query
    .skip(from)
    .limit(limit)
    .then((dbCategories) => {
      return res.json({
        ok: true,
        categories: dbCategories,
      });
    })
    .catch((err) => {
      res.json({
        ok: false,
        err,
      });
    });
});

route.get("/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;

  Category.findById(categoryId)
    .populate({
      path: "posts",
      select: "title description author referentialImage createdAt comments",
    })
    .then((category) => {
      return res.json({
        ok: true,
        category,
        numberOfPosts: category.posts.length,
      });
    })
    .catch((err) => {
      res.json({
        ok: false,
        err,
      });
    });
});

route.get("/name/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;

  Category.findById(categoryId)
    .then((category) => {
      return res.json({
        ok: true,
        category: category.name,
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

  let category = new Category({
    name,
  });

  category.save((err) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        err,
      });
    }

    res.json({
      ok: true,
      category,
    });
  });
});

route.put("/:categoryId/:postId", (req, res) => {
  const { categoryId, postId } = req.params;

  Category.findById(categoryId)
    .then((dbCategory) => {
      dbCategory.posts.push(postId);

      return dbCategory.save();
    })
    .then(() => {
      return res.json({
        ok: true,
        message: "Post agregado a la categoria",
      });
    })
    .catch((err) => {
      res.status(400).json({
        ok: false,
        err,
      });
    });
});

route.delete("/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;

  Category.findById(categoryId)
    .then((category) => {
      return category.remove({ _id: categoryId });
    })
    .then(() => {
      return res.json({
        ok: true,
        message: "Categoria borrada",
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
