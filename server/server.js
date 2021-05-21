// require("./config/config");
if(process.env.NODE_ENV !== "produccion") {
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const app = express();

//middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.resolve(__dirname, "../public")));
app.use(express.json());
// app.use(cors({origin: "http://localhost:3000"}));
app.use(cors())

//rutas
app.use(require("./routes/index"));

//conexion mongodb
mongoose.connect(process.env.MONGO_URI, (err, res) => {
    if(err) throw err;
    console.log("Base de datos online");
});

app.listen(process.env.PORT, () => {
    console.log("ENTORNO:", process.env.NODE_ENV);
    console.log("ESCUCHANDO EN EL PUERTO " + process.env.PORT);
});