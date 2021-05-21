const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const CategoriesSchema = new Schema({
  name: {
    type: String,
    required: [true, "El nombre de la categoria es obligatorio"],
    unique: true,
  },
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: "Posts",
    },
  ],
  clickedTimes: {
    type: Number,
    default: 0,
  },
});

CategoriesSchema.pre("remove", function (next) {
  const Post = mongoose.model("Posts");
  const Comment = mongoose.model("Comments");

  Comment.remove({ post: { $in: this.posts } })
    .then(() => {
      return Post.remove({ _id: { $in: this.posts } });
    })
    .then(() => next())
    .catch((err) => {
      next(err);
    });
});

mongoose.plugin(uniqueValidator, {
  message: "{PATH} debe ser unico",
});

module.exports = mongoose.model("Categories", CategoriesSchema);
