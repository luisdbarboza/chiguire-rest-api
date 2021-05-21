const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  let token = req.get("token");

  jwt.verify(token, process.env.SEED, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        ok: false,
        err,
      });
    }

    req.user = decoded.user;

    next();
  });
};

const verifyAdminRole = (req, res, next) => {
  const role = req.user.role;

  if (role !== "ADMIN_ROLE") {
    return res.status(401).json({
      ok: false,
      message: "No posees los permisos necesarios para utilizar este servicio",
    });
  }

  next();
};

//middleware para imagenes
const verifyTokenURL = (req, res, next) => {
  const token = req.query.token;

  jwt.verify(token, process.env.SEED, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        ok: false,
        err,
      });
    }

    req.user = decoded.user;

    next();
  });
};

module.exports = {
  verifyToken,
  verifyAdminRole,
  verifyTokenURL
};
