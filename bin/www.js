#!/usr/bin/env node

/**
 * Module dependencies.
 */
var express = require('express')
var app = express()
var bodyparser = require('body-parser')
var stylus = require('stylus')
var path = require('path')

//db
var mongo = require('mongodb').MongoClient
var db = 'mongodb://admin:Tambov6966@ds036709.mlab.com:36709/ztaskazure'
var contacts_col = 'contacts'

//session
var mongoose = require("mongoose")
mongoose.Promise = global.Promise;
var session = require('express-session')
var MongoStore = require('connect-mongo')(session);

//users
// var router = express.Router()
var api = require('../api.js')

//requests //file_get_contents
var request = require('request')
//iconv // convert encoding
var iconv = require('iconv-lite')
//needle a request analog
var needle = require('needle')
//tress async multi file_get_contents
var tress = require('tress')
var cheerio = require('cheerio')
var resolve = require('url').resolve
var fs = require('fs')

app.use(bodyparser.urlencoded({extended: false}))
app.use(stylus.middleware(path.join(__dirname,'../public')))
app.use(express.static(path.join(__dirname,'../public')))
app.use(express.static(path.join(__dirname,'../views')))

app.set('view engine', 'jade')

//session use
app.use(session({
    secret: 'i need more beers',
    resave: false,
    saveUninitialized: false,
    // Место хранения можно выбрать из множества вариантов, это и БД и файлы и Memcached.
    store: new MongoStore({
        url: 'mongodb://admin:Tambov6966@ds036709.mlab.com:36709/ztaskazure',
    })
}))


var port = normalizePort(process.env.PORT || '3000')
app.listen(port)

app.get('/', function(req,res){
  var loggedIn = (req.session.user) ? true : false
    console.log(req.session.user)
  res.render('index', {h1: 'Home', text: 'Hello world!', loggedIn: loggedIn})
})

app.post('/', function(req,res){
    if(req.body.token){
        request.get('http://ulogin.ru/token.php?token=' + req.body.token + '&host=' + req.headers.host, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body)
                if(body.email=='vasilev.dm@gmail.com'){
                    req.session.user = {id: body.uid, name: body.first_name + ' ' + body.last_name, email: body.email}
                    req.session.save()
                    // app.use(session(req.session.user))
                    console.log(req.session.user)
                    // res.redirect('/hidden')
                }
            }
        });
    }
    var loggedIn = (req.session.user) ? true : false
    res.render('index', {h1: 'Home', text: 'Hello world!', loggedIn: loggedIn})
})

app.get('/about', function(req,res) {
    var loggedIn = (req.session.user) ? true : false
    res.render('index', {h1: 'About', text: 'Nodejs + express project', loggedIn: loggedIn})
})

app.route('/contact').get(function(req,res,next) {
  var loggedIn = (req.session.user) ? true : false
  //for get
  var res_text = '';
  mongo.connect(db, function (err,db) {
    db.collection(contacts_col).find({}).toArray(function (err,dbres) {
      if(err) throw err
      /*dbres.forEach(function (obj) {
          res_text += '<div>name: ' + obj.name + ' text: ' + obj.text + '</div><br>'
      })*/
      res_text = dbres
      db.close()
      res.render('contact', {h1: 'Contact', text: 'Request form', requests: res_text, loggedIn: loggedIn})
    })
  })
}).post(function(req,res,next) {
  //for post
  var post = req.body;
  mongo.connect(db, function(err,db){
      if(err) throw err
      if(post.name && post.text) {
          var collection = db.collection(contacts_col)
          collection.insert({
              name: post.name,
              text: post.text
          },function(err,dbres){
              if(err) throw err
              // db.close()
          })
      }
      db.collection(contacts_col).find({}).toArray(function (err,dbres) {
        if(err) throw err
        db.close()
        res.render('contact', {h1: 'Contact', text: 'Request form', requests: dbres})
      })
  })
})


//work with users
/* Создание пользователя */
app.post('/user/login', function(req, res, next) {
    if (req.session.user) return res.redirect('/user')

    api.checkUser(req.body)
        .then(function(user){
            if(user){
                req.session.user = {id: user._id, name: user.name}
                res.redirect('/user')
            } else {
                return next(error)
            }
        })
        .catch(function(error){
            return next(new Error('user not found'))
        })

})

app.post('/user', function(req, res, next) {
    api.createUser(req.body)
        .then(function(result){
            // console.log("User created")
            var data = {
                h1: 'User',
                text : 'User created',
                loggedIn : (req.session.user) ? true : false
            }
            res.render('user', data)
        })
        .catch(function(err){
            console.log(err)
            err = JSON.stringify(err)
            if (err.code == 11000){
            // if (err.toJSON().code == 11000){
                res.status(500)/*.send("This email already exist")*/
                var data = {
                    h1: 'User',
                    text : 'This email already exist',
                    loggedIn : (req.session.user) ? true : false
                }
                res.render('user', data)
            }
        })
})

app.route('/user/logout').get(function(req, res, next) {
    if (req.session.user) {
        delete req.session.user;
        res.redirect('/user')
    }
}).post(function(req, res, next) {
    if (req.session.user) {
        delete req.session.user;
        res.redirect('/user')
    }
})

/* GET userhome page. */
app.get('/user', function(req, res, next) {
    var userlist = '';
    mongo.connect(db, function(err,db){
        if(err) throw err
        db.collection('users').find({}).toArray(function (err,dbres) {
            if(err) throw err
            db.close()
            dbres.forEach(function(item){
                userlist = userlist+' '+item.name+':'+item.email
            })
            if(req.session.user){
                var data = {
                    h1: 'User',
                    user : req.session.user,
                    loggedIn : (req.session.user) ? true : false,
                    list: userlist
                }
                res.render('user', data)
            } else {
                var data = {
                    h1: 'User',
                    loggedIn : (req.session.user) ? true : false,
                    list: userlist
                }
                res.render('user', data)
            }
        })
    })
})


//hidden
app.get('/hidden', function(req, res, next) {
    if(req.session.user){
        var data = {
            'text': 'You are best'
        }
        res.render('index', {h1: 'Hidden place', text: 'For authorized only', loggedIn: (req.session.user) ? true : false, data: data})
    }else{
        var data = {}
        res.status(403).render('index', {h1: 'Hidden place', text: 'For authorized only', loggedIn: (req.session.user) ? true : false, data: data})
    }
})

//parser
app.get('/parser', function (req, res, next) {
    var URL = 'https://www.ferra.ru/ru/techlife/news/'
    var results = []
    // `tress` последовательно вызывает наш обработчик для каждой ссылки в очереди
    var q = tress(function(url, callback){
        //тут мы обрабатываем страницу с адресом url
        needle.get(url, function(err, res) {
            if(err) throw err
            // парсим DOM
            var $ = cheerio.load(res.body)
            //информация о новости
            if($('.topic-about__date').length>0){
                results.push({
                    title: $('h1').text(),
                    date: $('.topic-about__date').text(),
                    href: url,
                    size: $('.topic-body').text().length
                })
            }
            //список новостей
            $('.newslist__item').each(function(){
                q.push('https:'+$(this).find('div>a').attr('href'))
            })
            //паджинатор
            /*$('.bpr_next>a').each(function() {
                // не забываем привести относительный адрес ссылки к абсолютному
                q.push(resolve(URL, $(this).attr('href')))
            })*/
            callback() //вызываем callback в конце
        })
    }, 5)
    // эта функция выполнится, когда в очереди закончатся ссылки
    q.drain = function () {
        require('fs').writeFileSync('./data.json', JSON.stringify(results, null, 4))
        var loggedIn = (req.session.user) ? true : false
        var text = '';
        results.forEach(function(obj){
            text+= 'title: '+obj.title+' || '
            text+= 'date: '+obj.date+' || '
            text+= 'href: '+obj.href+' || '
            text+= 'size: '+obj.size+' || '
        })
        res.render('index', {h1: 'Parser test', text: text, loggedIn: loggedIn})
    }
    // добавляем в очередь ссылку на первую страницу списка
    q.push(URL)
})



//



// var http = require('http');
// var server = http.createServer(function(req,res){
//   res.writeHead(200, {'Content-Type': 'text/html'});
//   res.end('Hello world!!');
// })
// var port = normalizePort(process.env.PORT || '3000');
// server.listen(port);

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// var app = require('../app');
// var debug = require('debug')('noda:server');
// var http = require('http');
//
// /**
//  * Get port from environment and store in Express.
//  */
//
// var port = normalizePort(process.env.PORT || '3000');
// app.set('port', port);
//
// /**
//  * Create HTTP server.
//  */
//
// var server = http.createServer(app);
//
// /**
//  * Listen on provided port, on all network interfaces.
//  */
//
// server.listen(port);
// server.on('error', onError);
// server.on('listening', onListening);
//
// /**
//  * Normalize a port into a number, string, or false.
//  */
//
// function normalizePort(val) {
//   var port = parseInt(val, 10);
//
//   if (isNaN(port)) {
//     // named pipe
//     return val;
//   }
//
//   if (port >= 0) {
//     // port number
//     return port;
//   }
//
//   return false;
// }
//
// /**
//  * Event listener for HTTP server "error" event.
//  */
//
// function onError(error) {
//   if (error.syscall !== 'listen') {
//     throw error;
//   }
//
//   var bind = typeof port === 'string'
//     ? 'Pipe ' + port
//     : 'Port ' + port;
//
//   // handle specific listen errors with friendly messages
//   switch (error.code) {
//     case 'EACCES':
//       console.error(bind + ' requires elevated privileges');
//       process.exit(1);
//       break;
//     case 'EADDRINUSE':
//       console.error(bind + ' is already in use');
//       process.exit(1);
//       break;
//     default:
//       throw error;
//   }
// }
//
// /**
//  * Event listener for HTTP server "listening" event.
//  */
//
// function onListening() {
//   var addr = server.address();
//   var bind = typeof addr === 'string'
//     ? 'pipe ' + addr
//     : 'port ' + addr.port;
//   debug('Listening on ' + bind);
// }
