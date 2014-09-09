/**
 * Node Server
 * simulate the gh-pages server
 */

// require
var express = require('express');
var app = express();
var http = require('http');

app.set('nodePort', process.env.NODE_PORT || 3000);
app.configure(function() {
	app.use(app.router);
});

// ===== index =====
app.get('/', function (req, res, next) {
	var path = __dirname + '/index.html';
	res.sendfile(path);
});

// ===== polytree =====
app.get('/polytree/:file', function (req, res, next) {
	var path = __dirname + '/polytree/' + req.params.file;
	res.sendfile(path);
});

// ===== com =====
app.get('/com/:dir/:file', function (req, res, next) {
	var path = __dirname + '/com/' + req.params.dir + '/' + req.params.file;
	res.sendfile(path);
});

// ===== start =====
http.createServer(app).listen(app.get('nodePort'), function(){
  console.log('server listening on port ' + app.get('nodePort'));
});