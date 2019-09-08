var express = require('express');
var app = express();
var http = require('http').createServer(app);
var bodyParser = require('body-parser');
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

http.listen(4000, function () {
  console.log('Server corriendo en puerto 4000, bien hecho!');
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/jquery-3.4.1.min.js', function (req, res) {
  res.sendFile(__dirname + '/jquery-3.4.1.min.js');
});

app.get('/productos.json', function (req, res) {
  res.sendFile(__dirname + '/productos.json');
});
