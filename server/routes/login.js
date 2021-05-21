const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/users");
const jwt = require("jsonwebtoken");
const route = express.Router();

route.post("/", (req, res) => {
    const {body} = req;

    User.findOne({email: body.email}, (err, dbUser) => {
        if(err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        if(!dbUser) {
            return res.status(400).json({
                ok: false,
                message: "Usuario o contrasenas incorrectos"
            });
        }

        if(!bcrypt.compareSync(body.password, dbUser.password)) {
            return res.status(400).json({
                ok: false,
                message: "Usuario o contrasenas incorrectos"
            });
        }

        if(!dbUser.confirmed) {
            return res.status(401).json({
                ok: false,
                message: "No has confirmado tu correo electronico >:("
            });
        }

        let token = jwt.sign({
            user: dbUser
        }, process.env.SEED, {expiresIn: process.env.CADUCIDAD_TOKEN});

        res.json({
            ok: true,
            user: dbUser,
            token
        });
    });
});

module.exports = route;