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

app.get('/tables.json', function (req, res) {
  res.sendFile(__dirname + '/tables.json');
});

io.on('connection', function(socket){
  socket.on('tableopened', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Opened table ' + table[1]);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    socket.emit('tableopenedres', table[1]);
  });
  socket.on('tableclosed', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Closed table ' + table[1]);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    socket.emit('tableclosedres', table[1]);
  });
})
