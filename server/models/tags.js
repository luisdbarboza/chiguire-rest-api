const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const TagSchema = new Schema({
    name: {
        type: String,
        required: [true, "El nombre del tag es obligatorio"],
        unique: true
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: "Posts"
    }]
});

TagSchema.plugin(uniqueValidator, {
    message: '{PATH} debe ser unico'
});

module.exports = mongoose.model("Tags", TagSchema);