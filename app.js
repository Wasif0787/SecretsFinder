require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption")
// const md5 = require("md5")
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session')
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();

app.use(express.static("public"));
app.set("view-engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

const password = process.env.PASSWORD
mongoose.connect(`mongodb+srv://wasifhussain787:${password}@secrets.cumegie.mongodb.net/userDB`).then(() => {
    console.log("Connected to db");
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
    // secret: String
});

const secretSchema = new mongoose.Schema({
    secret: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

// const secret = process.env.SECRET
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = mongoose.model("User", userSchema)
const Secret = mongoose.model("Secret", secretSchema)

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets" || "https://secret-message-4uap.onrender.com/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home.ejs");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get("/login", function (req, res) {
    res.render("login.ejs");
});

app.post("/login", function (req, res) {
    // const username = req.body.username
    // const password = req.body.password
    // User.findOne({ email: username }).then((foundUser) => {
    //     if (foundUser) {
    //         bcrypt.compare(password,foundUser.password, function(err, result) {
    //             // result == true
    //             if(result===true){
    //                 console.log(foundUser.password);
    //                 res.render("secrets.ejs")
    //             }
    //         });
    //         // if (foundUser.password === password) {
    //         //     console.log(password);
    //         //     res.render("secrets.ejs")
    //         // }
    //     }
    // })
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.logIn(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})


app.get("/register", function (req, res) {
    res.render("register.ejs");
});

app.post("/register", function (req, res) {

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     })
    //     newUser.save().then(() => {
    //         res.render("secrets.ejs")
    //     })
    // });
    User.register({ username: req.body.username, active: false }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    });
})

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


app.get("/secrets", function (req, res) {
    // User.find({ "secret": { $ne: null } }).then((foundUser) => {
    //     if (foundUser) {
    //         res.render("secrets.ejs", { usersWithSecrets: foundUser })
    //     }
    // })
    Secret.find({ "secret": { $ne: null } }).then((foundSecret)=>{
        if(foundSecret){
            res.render("secrets.ejs",{usersWithSecrets: foundSecret})
        }
    })
})

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit.ejs")
    } else {
        res.redirect("/login")
    }
})

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    console.log(submittedSecret);
    // User.findById(req.user.id).then((foundUser) => {
    //     if (foundUser) {
    //         foundUser.secret = submittedSecret
    //         foundUser.save()
    //         res.redirect("/secrets")
    //     }
    // })
    const newSecret = new Secret({
        secret : submittedSecret
    })
    console.log(newSecret);
    newSecret.save().then(()=>{
        res.redirect("/secrets")
    })
})

app.listen(3000 || process.env.PORT, function () {
    console.log("Server started on port 3000");
});
