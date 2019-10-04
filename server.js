var express = require('express');
var app = express();
var http = require('http').createServer(app);
var bodyParser = require('body-parser');
var SimpleCrypto = require("simple-crypto-js").default;
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http);
var _secretKey = "BarPOS";
var simpleCrypto = new SimpleCrypto(_secretKey);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

http.listen(4000, function () {
  console.log('Server corriendo en puerto 4000, bien hecho!');
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/index.js', function (req, res) {
  res.sendFile(__dirname + '/index.js');
});

app.get('/style.css', function (req, res) {
  res.sendFile(__dirname + '/style.css');
});

app.get('/favicon.ico', function (req, res) {
  res.sendFile(__dirname + '/favicon.png');
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

app.get('/preloader.svg', function (req, res) {
  res.sendFile(__dirname + '/preloader.svg');
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

//Check diff
function getDiff(a, b){
    var diff = (isArray(a) ? [] : {});
    recursiveDiff(a, b, diff);
    return diff;
}

function recursiveDiff(a, b, node){
    var checked = [];

    for(var prop in a){
        if(typeof b[prop] == 'undefined'){
            addNode(prop, '[[removed]]', node);
        }
        else if(JSON.stringify(a[prop]) != JSON.stringify(b[prop])){
            // if value
            if(typeof b[prop] != 'object' || b[prop] == null){
                addNode(prop, b[prop], node);
            }
            else {
                // if array
                if(isArray(b[prop])){
                   addNode(prop, [], node);
                   recursiveDiff(a[prop], b[prop], node[prop]);
                }
                // if object
                else {
                    addNode(prop, {}, node);
                    recursiveDiff(a[prop], b[prop], node[prop]);
                }
            }
        }
    }
}

function addNode(prop, value, parent){
        parent[prop] = value;
}

function isArray(obj){
    return (Object.prototype.toString.call(obj) === '[object Array]');
}

//Check if reservation time has passed. If so, delete automatically after 15 minutes
function checkReservations {
  var tables = require('./mozos.json');
  for (var i=0; i<tables.length, i++) {
    for (var j=0; i<tables[i].reservations.length, j++) {
      var isExpired = //TIEMPO DE RESERVA - TIEMPO ACTUAL  < 15minutos
      if (isExpired) {
        tables[i].reservations.splice(j,1);
      }
    }
  }
}

//Password check and cookie giver

io.on('connection', function(socket){
  socket.on('ping', function(table){
    io.emit('pong', true);
  });
  socket.on('login', function(waiter) {
    //console.log(simpleCrypto.encrypt(1234));
    var waiters = require('./mozos.json');
    for (var i = 0; i<waiters.length; i++) {
      console.log('checking ' + waiters[i].nombre + waiter[0]);
      if (waiter[0] == waiters[i].nombre) {
        var cypheredPass = waiters[i].pass;
        var decrypt = simpleCrypto.decrypt(cypheredPass);
        if (waiter[1] == decrypt) {
          console.log('Login succesful from ' + waiter[0]);
          socket.emit('logResponse', true);
        } else {
          console.log('Login unsuccesful from ' + waiter[0]);
          socket.emit('logResponse', false);
        }
      break;
      }
    }
  })
  socket.on('tableopened', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Opened table ' + table[1]);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('tableopenedres', [table[1],table[2]]);
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
    var originalJSON = require('./tables.json');
    var newJSON = table[0];
    var newJSONs = JSON.stringify(newJSON);
    console.log('Altered table: ' + table[1]);
    console.log(getDiff(newJSON,originalJSON));
    fs.writeFile('tables.json', newJSONs, 'utf8', function callback(err) {
    });
    io.emit('alteredordersres', [table[1],table[0][table[1]-1]]);
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
  socket.on('removeReservation', function(table){
    var json = JSON.stringify(table[0]);
    console.log('Reservation removed from table: ' + table[1]);
    fs.writeFile('tables.json', json, 'utf8', function callback(err) {
    });
    io.emit('removeReservationRes', [table[1],table[0][table[1]-1]]);
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
