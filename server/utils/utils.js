const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

//validates image
const validateImage = (req, fileObject) => {
  let nameArray;
  let validExtensions = ["png", "jpg", "jpeg"];

  fileObject.file = req.file;
  fileObject.name = fileObject.file.originalname;

  nameArray = fileObject.name.split(".");

  fileObject.extension = nameArray[nameArray.length - 1];

  if (!validExtensions.includes(fileObject.extension)) {
    return {
      ok: false,
      err: "Las extensiones permitidas son " + validExtensions,
    };
  }

  return true;
};

const doesFileExist = (type, fileName) => {
  const imagePath = path.resolve(
    __dirname,
    `../../uploads/${type}/${fileName}`
  );

  return fs.existsSync(imagePath);
};

const deleteFile = (type, fileName) => {
  let imagePath = path.resolve(
    __dirname,
    `../../uploads/${type}/${fileName}`
  );

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

//move files to path
const moveFileToPath = async (fileObject) => {
  fileObject.file.mv(fileObject.path, (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    return;
  });
};

const validateID = (id) => {
  let valid = true;

  try {
    mongoose.Types.ObjectId(id);
  } catch {
    valid = false;
  }

  return valid;
}

const generateUniqueFilename = (uniqueId, filenameExtension) => {
  return `${uniqueId}${new Date().getMilliseconds()}.${
    filenameExtension
  }`;
} 

module.exports = {
  moveFileToPath,
  deleteFile,
  doesFileExist,
  validateImage,
  validateID,
  generateUniqueFilename
};
