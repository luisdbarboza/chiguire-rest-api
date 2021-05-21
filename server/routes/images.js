const express = require("express");
const path = require("path");
const fs = require("fs");
const { verifyTokenURL } = require("../middlewares/auth");
const route = express.Router();

route.get("/:type/:img", (req, res) => {
  const { type, img } = req.params;

  let imagePath = path.resolve(__dirname, `../../uploads/${type}/${img}`);

  let noImagePath = path.resolve(__dirname, `../assets/no-image.jpg`);

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.sendFile(noImagePath);
  }
});

module.exports = route;
