const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReplyReferenceSchema = new Schema({
  comment: {
    type: Schema.Types.ObjectId,
    required: [true, "El Id del comentario es requerido"],
  },
  username: {
    type: String,
    required: [true, "El nombre de usuario es requerido"],
  },
});

const CommentSchema = new Schema({
  post: {
    type: Schema.Types.ObjectId,
    ref: "Posts",
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: [true, "Es necesario tener los datos del usuario para comentar"],
  },
  content: {
    type: String,
    required: [true, "El titulo es obligatorio"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  replies: [
    {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
  ],
  upvotes: {
    type: Number,
    default: 0,
  },
  downvotes: {
    type: Number,
    default: 0,
  },
  repliedTo: {
    type: Schema.Types.ObjectId,
    ref: "Comments",
    default: null,
  },
});

CommentSchema.virtual("repliesCount").get(function () {
  return this.replies.length;
});

CommentSchema.methods.toJSON = function () {
  let comment = this;
  let commentObject = comment.toObject();

  commentObject.repliesCount = comment.repliesCount;

  return commentObject;
};

CommentSchema.post("save", function (comment, next) {
  const Comment = mongoose.model("Comments");
  const Post = mongoose.model("Posts");

  if (comment.repliedTo !== null) {
    Post.findById(comment.post)
      .then((dbPost) => {
        dbPost.comments.push(comment);

        return dbPost.update({ comments: dbPost.comments });
      })
      .then(() => {
        Comment.findById(comment.repliedTo).then((targetComment) => {
          targetComment.replies.push(comment);

          targetComment
            .update({ replies: targetComment.replies })
            .then(() => {
              next();
            })
            .catch((err) => console.log(err));
        });
      });
  } else {
    Post.findOne(comment.post)
      .then((dbPost) => {
        if (!dbPost.comments.includes(comment._id)) {
          dbPost.comments.push(comment);

          return dbPost.update({ comments: dbPost.comments });
        } else {
          return null;
        }
      })
      .then(() => {
        next();
      });
  }
});

module.exports = mongoose.model("Comments", CommentSchema);
