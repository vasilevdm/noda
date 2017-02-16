// authorization
var mongoose = require('mongoose');
var User = new mongoose.Schema({
    name : {
        type: String,
        unique: true,
        required: true
    },
    email : {
        type: String,
        required: false
    },
    password : {
        type: String,
        required: true
    }
})
module.exports = mongoose.model('User', User)