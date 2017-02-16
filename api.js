var mongoose = require('mongoose')
mongoose.Promise = global.Promise;
var crypto = require('crypto')
var db = mongoose.connect('mongodb://admin:Tambov6966@ds036709.mlab.com:36709/ztaskazure')
var User = require('./user.js')

// User API

exports.createUser = function(userData){
    var user = {
        name: userData.name,
        email: userData.email,
        password: hash(userData.password)
    }
    return new User(user).save()
}

exports.getUser = function(id) {
    return User.findOne(id)
}

exports.checkUser = function(userData) {
    return User
        .findOne({email: userData.email, password: hash(userData.password)}
            ,function(err, doc){
            return Promise.resolve(doc)
            /*if ( doc && doc.password == hash(userData.password) ){
                console.log("User password is ok");
                return Promise.resolve(doc)
            } else {
                console.log("User password is NOK");
                return Promise.reject("Error wrong")
            }*/
        })
}

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}