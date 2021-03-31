//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session")
const passport = require("passport");
//You're free to define your User how you like. Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value.
const passportLocalMongoose = require("passport-local-mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const findOrCreate = require("mongoose-findorcreate");


const app = express();

//console.log(process.env.API_KEY);

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our Little Secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//"mongodb://localhost:27017/todoDB"
mongoose.connect("mongodb+srv://admin-palak:Test123@todolist.xakwo.mongodb.net/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


//userSchema.plugin(encrypt, {
//    secret: process.env.SECRET,
//    encryptedFields: ["password"]
//}); ///use the plugin always before the modell

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRETS,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_SECRETS,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({
            facebookId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate('google', {
        scope: ['profile']
    }));
//requesting google {sign in with google}

app.get("/auth/google/secrets",
    passport.authenticate('google', {
        failureRedirect: "/login" //if failed then redirect to login
    }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });


app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });



app.get("/login", function (req, res) {
    res.render("login")
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
   User.find({"secret":{$ne:null}}/*to check if the user has the secret before*/, function(err, found){
       if(err){
           console.log(err);
       }else{
           if(found){
               res.render("secrets",{userWithSecrets: found});
           }
       }
   });  
});



app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.get("/submit", function (req, res) {
    //checking if yhe user has logged in
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req,res){
   const submitsecret= req.body.secret;
    
//    console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
       if(err){
           console.log(err);
       } else{
           if(foundUser){
               foundUser.secret=submitsecret;
               foundUser.save(function(){
                   res.redirect("/secrets");
               })
           }
       }
    });
    
});


app.get('/favicon.ico', function(req, res) { 
    res.status(204);
    res.end();    
});


app.post("/register", function (req, res) {
    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

    { //    //to generate hash
        //{     bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        //        const newUser = new User({
        //            email: req.body.username,
        //            //         password: md5(req.body.password)
        //            password: hash
        //        });
        //
        //
        //        newUser.save(function (err) {
        //            if (err) {
        //                console.log(err);
        //            } else {
        //                res.render("secrets");
        //            }
        //        });
        //    });
    }
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local", {
                failureRedirect: "/login"
            })(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

    { //    { const username = req.body.username;
        //    const password = req.body.password;
        //  
        //
        //    User.findOne({email: username}, function (err, founduser) {
        //    if (err) {
        //        console.log(err);
        //    } else {
        //        if (founduser) {
        //            bcrypt.compare(password, founduser.password, function (err, result) {
        //                if (result == true) {
        //                    res.render("secrets");
        //                }
        //            });
        //        }
        //    }
        //});
    }
});

let port = process.env.PORT;
if(port== null || port==""){
    port=3000;
}
app.listen(port, function () {
    console.log("Server has started succesfully!!!");
});









//Before using passport-google-oauth20, you must register an application with Google. If you have not already done so, a new project can be created in the Google Developers Console. Your application will be issued a client ID and client secret, which need to be provided to the strategy. You will also need to configure a redirect URI which matches the route in your application
