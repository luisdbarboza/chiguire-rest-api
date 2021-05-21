const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const util = require("util");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const _ = require("lodash");
const User = require("../models/users");
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

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SERVER_GMAIL_ACCOUNT,
    pass: process.env.SERVER_GMAIL_PASSWORD,
  },
});

transporter.verify().then(() => {
  console.log("Ready to send emails ;)");
});

const EMAIL_SECRET = process.env.EMAIL_SECRET;

//Cambia el nombre del archivo subido y establece su ruta destino
const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const nameArray = file.originalname.split(".");
    const extension = nameArray[nameArray.length - 1];
    const filename = generateUniqueFilename(uuidv4(), extension);

    cb(null, filename);
  },
  destination: path.join(__dirname, "../../uploads/users"),
});

route.get("/", [verifyToken, verifyAdminRole], (req, res) => {
  const from = Number(req.query.from) || 0;
  const limit = Number(req.query.limit) || 5;

  User.find({}, "name username email role profilePicture subscribed")
    .skip(from)
    .limit(limit)
    .then((dbUsers) => {
      User.count({}).then((numberOfUsers) => {
        res.json({
          ok: true,
          users: dbUsers,
          numberOfUsers,
        });
      });
    })
    .catch((err) => {
      res.status(500).json({
        ok: false,
        err,
      });
    });
});

route.get("/changePassword", verifyToken, (req, res) => {
  const user = req.user;

  jwt.sign(
    {
      user: user._id,
    },
    EMAIL_SECRET,
    {
      expiresIn: "1d",
    },
    (err, emailToken) => {
      const url = `http://localhost:3000/changePassword/${emailToken}`;
      const mailOptions = {
        from: process.env.SERVER_GMAIL_ACCOUNT,
        to: user.email,
        subject: "Cambio de contrasena",
        html: `Has solicitado un cambio de contrasena, haz click aqui si en verdad deseas hacerlo: <a href="${url}">${url}</a>`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            err,
          });
        } else {
          res.json({
            ok: true,
            message:
              "Te hemos enviado un enlace al correo para que cambies tu contrasena",
          });
        }
      });
    }
  );
});

route.post("/", (req, res) => {
  const { body } = req;

  User.findOne({
    email: body.email,
  }).then((dbUser) => {
    if (!dbUser) {
      saveUsers(res, body);
    } else {
      res.json({
        ok: false,
        err: {
          message: "Un usuario con ese correo electronico ya existe",
        },
      });
    }
  });
});

route.put(
  "/:id",
  [
    verifyToken,
    multer({
      storage,
    }).single("profilePicture"),
  ],
  async (req, res) => {
    const { id } = req.params;
    const unlink = util.promisify(fs.unlink);
    let result;

    if (validateID(id)) {
      const body = _.pick(req.body, [
        "name",
        "username",
        "email",
        "profilePicture",
        "confirmed",
        "role",
        "google",
        "subscribed",
      ]);

      if (req.file) {
        const profilePicture = {
          file: null,
          path: null,
          name: null,
          extension: null,
        };

        let isImageValid = validateImage(req, profilePicture);

        if (process.env.NODE_ENV === "produccion") {
          result = await cloudinary.v2.uploader.upload(req.file.path);
        }

        if (isImageValid !== true) {
          return res.status(400).json(isImageValid);
        }

        body.profilePicture =
          process.env.NODE_ENV === "produccion"
            ? result.url
            : req.file.filename;

        body.profilePicturePublicID =
          process.env.NODE_ENV === "produccion" ? result.public_id : null;

        if (process.env.NODE_ENV === "produccion") {
          unlink(req.file.path)
            .then(() => {
              updateUsers(res, id, body, true);
            })
            .catch((err) => {
              res.status(500).json({
                ok: false,
                err,
              });
            });
        } else {
          updateUsers(res, id, body, true);
        }
      } else {
        updateUsers(res, id, body);
      }
    } else {
      res.status(400).json({
        ok: false,
        err: "Usuario invalido",
      });
    }
  }
);

//Confirma la direccion de correo electronico
route.put("/confirmation/:token", async (req, res) => {
  try {
    const { user: id } = await jwt.verify(req.params.token, EMAIL_SECRET);
    await User.updateOne({ _id: id }, { confirmed: true });

    res.json({
      ok: true,
      message: "Cuenta activada!!!",
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      err,
    });
  }
});

route.put("/changePassword/:token", async (req, res) => {
  const password = bcrypt.hashSync(req.body.password, 10);

  try {
    const { user: id } = await jwt.verify(req.params.token, EMAIL_SECRET);
    await User.updateOne({ _id: id }, { password });

    res.json({
      ok: true,
      message: "Contrasena cambiada!!!",
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      err,
    });
  }
});

route.delete("/:id", [verifyToken, verifyAdminRole], (req, res) => {
  const { id } = req.params;

  if (validateID(id)) {
    User.findById(id)
      .then((dbUser) => {
        if (
          process.env.NODE_ENV === "produccion" &&
          dbUser.profilePicturePublicID
        ) {
          cloudinary.v2.api.delete_resources(
            [dbUser.profilePicturePublicID],
            (error, result) => {
              console.log(result, error);
            }
          );
        } else {
          if (updateFile && dbUser.profilePicture !== "") {
            deleteFile("users", dbUser.profilePicture);
          }
        }

        return dbUser.remove();
      })
      .then(() => {
        return res.json({
          ok: true,
          message: "Usuario borrado",
        });
      });
  } else {
    res.status(400).json({
      ok: false,
      err: "Usuario invalido",
    });
  }
});

function saveUsers(res, body) {
  let user = new User({
    username: body.username,
    email: body.email,
    password: bcrypt.hashSync(body.password, 10),
    role: body.role ? body.role : "USER_ROLE",
    google: body.google ? body.google : false,
  });

  jwt.sign(
    {
      user: user._id,
    },
    EMAIL_SECRET,
    {
      expiresIn: "1d",
    },
    (err, emailToken) => {
      const url = `http://localhost:3000/confirmation/${emailToken}`;
      const mailOptions = {
        from: process.env.SERVER_GMAIL_ACCOUNT,
        to: user.email,
        subject: "Confirma tu correo",
        html: `Por favor haz click aqui: <a href="${url}">${url}</a> para confirmar tu correo`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            err,
          });
        } else {
          user
            .save()
            .then((dbUser) => {
              return res.json({
                ok: true,
                user: dbUser,
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
    }
  );
}

function updateUsers(res, id, body, updateFile = false) {
  User.findById(id)
    .then((dbUser) => {
      if (!dbUser) throw new Error("Usuario no existe").message;

      if (
        process.env.NODE_ENV === "produccion" &&
        dbUser.profilePicturePublicID
      ) {
        cloudinary.v2.api.delete_resources(
          [dbUser.profilePicturePublicID],
          (error, result) => {
            console.log(result, error);
          }
        );
      } else {
        if (updateFile && User.profilePicture !== "") {
          deleteFile("users", User.profilePicture);
        }
      }

      User.updateOne({ _id: dbUser.id }, body)
        .then(() => User.findById(id))
        .then((dbUser) => {
          return res.json({
            ok: true,
            user: dbUser,
          });
        });
    })
    .catch((err) => {
      let status = err === "Usuario no existe" ? 400 : 500;

      if (updateFile && process.env.NODE_ENV === "produccion") {
        deleteFile("users", body.profilePicture);
      }

      res.status(status).json({
        ok: false,
        err,
      });
    });
}

module.exports = route;
