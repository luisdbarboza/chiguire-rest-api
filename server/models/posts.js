const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const PostSchema = new Schema({
  title: {
    type: String,
    required: [true, "El titulo es obligatorio"],
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  content: {
    type: String,
    required: [true, "El contenido es obligatorio"],
  },
  referentialImage: {
    type: String,
    required: [true, "Una imagen de referencia es obligatoria"],
  },
  referentialImagePublicID: {
    type: String,
    default: null
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "Users",
  },
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
  ],
  clickedTimes: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    required: [true, "Una descripcion es obligatoria"],
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Categories",
    required: [true, "Una categoria es obligatoria"]
  },
  tags: [
    {
      type: Schema.Types.ObjectId,
      ref: "Tags",
    },
  ],
});

PostSchema.virtual("numberOfComments").get(function () {
  return this.comments.length;
});

PostSchema.methods.toJSON = function () {
  let post = this;
  let postObject = post.toObject();

  postObject.numberOfComments = post.numberOfComments;
  delete postObject.comments;

  return postObject;
};

PostSchema.pre("remove", function (next) {
  const Comment = mongoose.model("Comments");
  const Category = mongoose.model("Categories");

  Category.findById(this.category._id).then((dbCategory) => {
    dbCategory.posts.remove(this);

    dbCategory.save().then(() => {
      Comment.remove({ post: this._id }).then(() => {
        next();
      });
    });
  });
});

PostSchema.post("save", function (post, next) {
  const Category = mongoose.model("Categories");
  Category.findById(post.category._id).then((dbCategory) => {
    dbCategory.posts.push(post);

    dbCategory.save().then(() => {
      next();
    });
  })
  .catch((err) => {
    next(err);
  })
});

PostSchema.plugin(uniqueValidator, {
  message: "{PATH} debe ser unico",
});

module.exports = mongoose.model("Posts", PostSchema);
