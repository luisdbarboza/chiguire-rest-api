const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

let Schema = mongoose.Schema;

let validRoles = {
  values: ["ADMIN_ROLE", "JOURNALIST_ROLE", "USER_ROLE"],
  message: "{VALUE} no es un valor permitido",
};

let usersSchema = new Schema({
  username: {
    type: String,
    required: [true, "El nombre de usuario es obligatorio"],
    validate: {
      validator: (username) => username.length > 5,
      message: "El nombre debe tener mas de 5 caracteres",
    },
    unique: true,
  },
  password: {
    type: String,
    required: [true, "La contrasena es obligatoria"],
  },
  email: {
    type: String,
    required: [true, "El email es obligatorio"],
    unique: true,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  profilePicture: {
    type: String,
    default: "",
  },
  profilePicturePublicID: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    default: "USER_ROLE",
    enum: validRoles,
  },
  google: {
    type: Boolean,
    default: false,
  },
});

usersSchema.pre("remove", function (next) {
  const Post = mongoose.model("Posts");
  const Comment = mongoose.model("Comments");

  Post.remove({ author: this._id }).then(() =>
    Comment.remove({ "user.username": this.username }).then(() => next())
  );
});

usersSchema.methods.toJSON = function () {
  let user = this;
  let userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

usersSchema.plugin(uniqueValidator, {
  message: "{PATH} debe ser unico",
});

module.exports = mongoose.model("Users", usersSchema);
