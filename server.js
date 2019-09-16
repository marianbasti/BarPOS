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

app.get('/mozos.json', function (req, res) {
  res.sendFile(__dirname + '/mozos.json');
});

app.get('/tables.json', function (req, res) {
  res.sendFile(__dirname + '/tables.json');
});

app.get('/order.mp3', function (req, res) {
  res.sendFile(__dirname + '/order.mp3');
});

app.get('/open.mp3', function (req, res) {
  res.sendFile(__dirname + '/open.mp3');
});

app.get('/closed.mp3', function (req, res) {
  res.sendFile(__dirname + '/closed.mp3');
});

app.get('/reset.mp3', function (req, res) {
  res.sendFile(__dirname + '/reset.mp3');
});

app.get('/calendar.html', function (req, res) {
  res.sendFile(__dirname + '/calendar.html');
});

app.get('/calendar.svg', function (req, res) {
  res.sendFile(__dirname + '/calendar.png');
});

app.get('/calendar-clear.png', function (req, res) {
  res.sendFile(__dirname + '/calendar-clear.png');
});

app.get('/config.png', function (req, res) {
  res.sendFile(__dirname + '/config.png');
});

app.get('/clean.png', function (req, res) {
  res.sendFile(__dirname + '/clean.png');
});

app.get('/close.png', function (req, res) {
  res.sendFile(__dirname + '/close.png');
});

io.on('connection', function(socket){
  socket.on('ping', function(table){
    io.emit('pong', true);
  });
  socket.on('tableopened', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Opened table ' + table[1]);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('tableopenedres', table[1]);
  });
  socket.on('tableclosed', function(table){
    table[0][table[1]-1].orders = [];
    var json = JSON.stringify(table[0]);
    console.log('Closed table ' + table[1]);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('tableclosedres', table[1]);
  });
  socket.on('alteredorders', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Altered table: ' + table[1]);
    console.log('Orders: ' + table[0][table[1]-1].orders);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('alteredordersres', [table[1],table[0][table[1]-1].orders]);
  });
  socket.on('alteredreserv', function(table){
    var json = JSON.stringify(table[0]);
    var ult = table[0][table[1]-1].reservations.length;
    console.log('Table reserved: ' + table[1]);
    console.log('A nombre de  ' + table[0][table[1]-1].reservations[ult-1].client);
    console.log('Time: ' + table[0][table[1]-1].reservations[ult-1].date);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('alteredreservres', [table[1],table[0][table[1]-1]]);
  });
  socket.on('resetTablesOrders', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Clearing all table orders');
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('resetTablesOrdersRes', true);
  });
  socket.on('resetTablesReservations', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Clearing all table reservations');
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('resetTablesReservationsRes', true);
  });
  socket.on('closeAllTables', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Closing all tables');
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('closeAllTablesRes', true);
  });
})
