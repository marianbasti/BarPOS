class Reservation {
  constructor() {
    this.date = new Date();
    this.client = "";
    this.partyOf = 0;
  }
}
class TABLE {
  constructor() {
    this.isOpen = false;
    this.waiter = "";
    this.timer = new Date();
    this.isReserved = false;
    this.reservations = [];
    this.orders = new Array();
    this.partyOf = 1;
    this.paymentMethod = "cash";
    this.paymentCard = "";
    this.discount = '';
    this.total = 0
  }
}

var socket = io();
var intervals = new Array(5);
var orderNotification = new Audio('/order.mp3');
//Notification sounds downloaded from https://notificationsounds.com
//Provided under a Creative Commons Attribution license https://creativecommons.org/licenses/by/4.0/legalcode
var openNotification = new Audio('/open.mp3');
var closedNotification = new Audio('/closed.mp3');
var resetNotification =new Audio('/reset.mp3');
var tables = [new TABLE(),new TABLE(),new TABLE(),new TABLE(),new TABLE()];
var currentTime = new Date();
var currentWaiter = '';
var products;

Number.prototype.toFixedDown = function(digits) {
  var n = this - Math.pow(10, -digits)/2;
  n += n / Math.pow(2, 53); // added 1360765523: 17.56.toFixedDown(2) === "17.56"
  return n.toFixed(digits);
}

function checkTime(i) {
  if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
  return i;
}


//HARD RESET ALL TABLES
//socket.emit('alteredorders',[tables,1]);

function setClock(i) {
  intervals[i] = setInterval(function() {
    var time = new Date(currentTime - tables[i].timer);
    time.setHours(time.getHours()-21)
    var h = checkTime(time.getHours());
    var m = checkTime(time.getMinutes());
    var s = checkTime(time.getSeconds());
    $('#clock' + Number(i+1)).text(h+':'+m+':'+s);
  },1000)
}

function populateOrderTable(table) {
  $('#orderTable').empty();
  $('#orderTable').append("<tr><th>Item</th><th>Cantidad</th><th>Precio</th><th></th></tr>");
  for (var i = 0; i<tables[table].orders.length; i++) {
    order = tables[table].orders[i];
    var markup = "<tr id='o" + i + "' class='" + order[1] + "'><td>" + order[2] + "</td><td class='cantitem'>" + order[3] + "<input class='addsame' type='button' value='+'><input class='removesame' type='button' value='-'></td><td class='monto'>" + order[0] + "</td><td> <input class='removeFromList' type='button' value='X'></td></tr>";
    $("#orderTable tr:last").after(markup);
  }
  $('#paymentMethod').val(tables[table].paymentMethod);
  if (tables[table].paymentMethod != 'cash') {
    $('#paymentCard').val(tables[table].paymentCard);
    $('#paymentCard').show();
  } else {
    $('#paymentCard').hide();
  }
  if (tables[table].discount > 0){
    $('#discount').val(tables[table].discount);
  } else {
    $('#discount').val('');
  }
}

function computeTotal() {
  var total = 0;
  var table = tables[$('#tablename').text()[5]-1];
  $('tr').each(function() {
    total = total + (Number($(this).find('.monto').text()) * Number($(this).find('.cantitem').text()));
  })
  if (table.discount > 0) {
    total = total * (1-(table.discount/100));
    total = total.toFixed(2) + ' (' + table.discount + '% de descuento)';
  }
  return(total);
}

function isTimeSlotAvailable(date,table) {
  var timeSlot = new Date(date);
  timeSlot.setSeconds(0);
  // If there's no other reservation for the table, time slot is obviously available
  if (tables[table].reservations.length == 0) {
    return(true);
  }
  for (var i = 0; i<tables[table].reservations.length; i++) {
    var timeDiff = timeSlot.getTime() - new Date(tables[table].reservations[i].date).getTime();
    //Check if it steps on any other reservation in a range of 2 hours prior or later
    //Gotta make this a setting
    if (timeDiff < 7195000 && timeDiff > -7195000) {
      return false;
    }
  }
  return(true);
}

function customAlert(msg) {
  $('#customAlertMessage').text(msg);
  $('#customAlertAccept').show();
  $('#customAlertConfirm').hide();
  $('#customAlertCancel').hide();
  $('#customAlert').fadeIn('fast');
  $('#customAlertAccept').on('click', function() {
    $('#customAlertAccept').off();
    $('#customAlert').fadeOut('fast');
  })
}

function customConfirm(msg, functionToExecute) {
  $('#customAlertMessage').text(msg);
  $('#customAlertAccept').hide();
  $('#customAlertConfirm').show();
  $('#customAlertCancel').show();
  $('#customAlert').fadeIn('fast');
  $('#customAlertConfirm').on('click', function() {
    $('#customAlertConfirm').off();
    $('#customAlertCancel').off();
    $('#customAlert').fadeOut('fast');
    functionToExecute()
  })
  $('#customAlertCancel').on('click', function() {
    $('#customAlertConfirm').off();
    $('#customAlertCancel').off();
    $('#customAlert').fadeOut('fast');
    return(false);
  })
}

function closeTable() {
  tableclosed = $('#tablename').text()[5];
  $('#table' + tableclosed).css('background-color', '#000000');
  tables[tableclosed-1].isOpen = false;
  tables[tableclosed-1].orders = [];
  tables[tableclosed-1].waiter = "";
  tables[tableclosed-1].partyOf = 1;
  tables[tableclosed-1].paymentMethod = "cash";
  tables[tableclosed-1].paymentCard = "";
  tables[tableclosed-1].discount = 0;
  populateOrderTable(tableclosed-1)
  $('#closetable').fadeOut('fast');
  $('#opentable').fadeIn('fast');
  $('#thisTableWaiter').text('');
  $('#clock' + tableclosed).fadeOut();
  $('#clock' + tableclosed).text('00:00:00')
  clearInterval(intervals[tableclosed-1]);
  console.log('Cerrando mesa '+ tableclosed);
  socket.emit('tableclosed', [tables, tableclosed]);
}

$('#clock1').hide();
$('#clock2').hide();
$('#clock3').hide();
$('#clock4').hide();
$('#clock5').hide();
$('#customAlert').hide();
$('#reserved1').hide();
$('#reserved2').hide();
$('#reserved3').hide();
$('#reserved4').hide();
$('#reserved5').hide();
$('#leftPanel').hide();
$('#configTableModal').hide();
$('#modalReservationTime').hide();
$('#leftPanelDetailCleanOrders').hide();
$('#leftPanelDetailCleanreservations').hide();
$('#leftPanelDetailCloseTables').hide();
$('#leftPanelDetailListReservations').hide();
$('#leftPanelSettings').hide();
$('#paymentCard').hide();
$('#modalCalendar').hide();


$('#resetTablesOrders').on('click', function(){
  for (var i = 0; i<tables.length; i++){
    tables[i].orders = [];
  }
  console.log('Borrando todas las ordenes...');
  socket.emit('resetTablesOrders', [tables,1]);
})
$('#resetTablesReservations').on('click', function(){
  for (var i = 0; i<tables.length; i++){
    tables[i].reservations = [];
    tables[i].isReserved = false;
  }
  console.log('Borrando todas las reservas...');
  socket.emit('resetTablesReservations', [tables,1]);
})
$('#CloseAllTables').on('click', function(){
  for (var i = 0; i<tables.length; i++){
    tables[i].orders = [];
    tables[i].isOpen = false;
    tables[i].waiter = "";
    tables[i].partyOf = 1;
    tables[i].paymentMethod = "cash";
    tables[i].paymentCard = "";
    tables[i].discount = 0;
  }
  console.log('Borrando todas las reservas...');
  socket.emit('closeAllTables', [tables,1]);
})

//BASES DE DATOS
$.getJSON("/productos.json", function(response) {
  var sel = $('#products');
  products = response;
 $.each(response, function(categoria){
   sel.append($("<optgroup>").attr('label',categoria));
   for (var i = 0; i<response[categoria].length; i++) {
     sel.append($("<option>").attr('value', [response[categoria][i].valor,response[categoria][i].dbid]).text(response[categoria][i].nombre));
   }
 })
});
$.getJSON("/mozos.json", function(response) {
  var sel = $('#waiters');
  for (var i = 0; i<response.length; i++) {
    sel.append($("<option>").attr('value', response[i].nombre).text(response[i].nombre));
  }
});
$.getJSON("/tables.json", function(response) {
  for (var i = 0; i<tables.length; i++) {
    tables[i].isOpen = response[i].isOpen;
    tables[i].timer = new Date(response[i].timer);
    tables[i].isReserved = response[i].isReserved;
    tables[i].reservations = response[i].reservations;
    tables[i].waiter = response[i].waiter;
    tables[i].orders = response[i].orders;
    tables[i].partyOf = response[i].partyOf;
    tables[i].paymentMethod = response[i].paymentMethod;
    tables[i].paymentCard = response[i].paymentCard;
    tables[i].discount = response[i].discount;
    tables[i].total = response[i].total;
    if (tables[i].isOpen == true) {
      $('#table' + Number(i+1)).css('background-color', '#22cc22');
      $('#clock' + Number(i+1)).show();
      setClock(i);
      console.log("Mesa " + Number(i+1) + ' está abierta');
    }
    if (tables[i].isReserved == true) {
      $('#reserved' + Number(i+1)).show();
    }
  }
});

//FUNCIONES DE LAS MESAS
$('#addproduct').on('click', function() {
  var tablealtered = $('#tablename').text()[5];
  itemval = $('#products option:selected').val().split(',');
  itemval.push($('#products option:selected').text());
  itemval.push(1);
  //alterar mesa
  tables[tablealtered-1].orders.push(itemval);
  console.log('Agregado item "' + itemval + '" a la mesa ' + Number(tablealtered));
  //AÑADIR ITEM CON SU NOMBRE, COSTO Y BOTON DE QUITAR
  var markup = "<tr id='o" + tables[tablealtered-1].orders.length + "' class='" + itemval[1] + "'><td>" + $('#products option:selected').text() + "</td><td class='cantitem'>1<input class='addsame' type='button' value='+'><input class='removesame' type='button' value='-'></td><td class='monto'>" + itemval[0] + "</td><td> <input class='removeFromList' type='button' value='X'></td></tr>";
  $("#orderTable tr:last").after(markup);
  $('#total').text(computeTotal());
  tables[tablealtered-1].total = computeTotal();
  socket.emit('alteredorders', [tables, tablealtered]);
})
$("#orderTable").on('click', '.removeFromList', function() {
  var item = $(this).parent().parent().find('td:first').text();
  var tablealtered = $('#tablename').text()[5];
  for(var i = 0; i<tables[tablealtered-1].orders.length; i++) {
    if(tables[tablealtered-1].orders[i].includes(item)) {
      console.log('contiene ' + item + ' en posicion ' + i);
      tables[tablealtered-1].orders.splice(i,1)
    };
  }
  $(this).closest('tr').remove();
  $('#total').text(computeTotal());
  tables[$('#tablename').text()[5]-1].total = computeTotal();
  socket.emit('alteredorders', [tables, tablealtered]);
})
$("#orderTable").on('click', '.addsame', function(e) {
  e.stopPropagation();
  tables[$('#tablename').text()[5]-1].orders[$(this).closest('tr').attr('id')[1]][3]++;
  var markup = "<input class='addsame' type='button' value='+'><input class='removesame' type='button' value='-'>";
  $(this).closest('.cantitem').html(Number($(this).closest('.cantitem').text())+1 + markup);
  $('#total').text(computeTotal());
  tables[$('#tablename').text()[5]-1].total = computeTotal();
  socket.emit('alteredorders', [tables, $('#tablename').text()[5]]);
})
$("#orderTable").on('click', '.removesame', function(e) {
  e.stopPropagation();
  var markup = "<input class='addsame' type='button' value='+'><input class='removesame' type='button' value='-'>";
  if (Number($(this).closest('.cantitem').text()) > 1 ) {
    tables[$('#tablename').text()[5]-1].orders[$(this).closest('tr').attr('id')[1]][3]--;
    $(this).closest('.cantitem').html(Number($(this).closest('.cantitem').text())-1 + markup);
    $('#total').text(computeTotal());
    tables[$('#tablename').text()[5]-1].total = computeTotal();
    socket.emit('alteredorders', [tables, $('#tablename').text()[5]]);
  }
})
$("#partyOf").on('change', function() {
  var tableopened = $('#tablename').text();
  tables[tableopened[5]-1].partyOf = $("#partyOf").val();
  socket.emit('alteredorders', [tables, tableopened[5]]);
})

$('#opentable').on('click', function() {
  var tableopened = $('#tablename').text();
  $('#table' + tableopened[5]).css('background-color', '#22cc22');
  tables[tableopened[5]-1].isOpen = true;
  tables[tableopened[5]-1].waiter = currentWaiter;
  $('#partyOf').val(1);
  $('#total').text('0');
  $('#closetable').show();
  $('#opentable').fadeOut('fast');
  tables[tableopened[5]-1].timer.setTime(currentTime);
  setClock(tableopened[5]-1);
  $('#clock' + tableopened[5]).fadeIn();
  console.log('Abriendo mesa '+ tableopened[5]);
  socket.emit('tableopened', [tables, tableopened[5], tables[tableopened[5]-1].waiter]);
});

$('#closetable').on('click', function() {
  customConfirm('Cerrar mesa?', closeTable)
});

$('#configTableButton').on('click', function() {
  var table = $('#tablename').text()[5];
})

$('#configTableModal').on('click', function() {
  $('#configTableModal').fadeOut();
})
$('#configTable').on('click', function(e) {
  e.stopPropagation();
})

$('#paymentMethod').on('change', function() {
  var mesa = $('#tablename').text()[5];
  if ($('#paymentMethod').val() == 'cash') {
    $('#paymentCard').fadeOut();
    tables[mesa-1].paymentCard = '';
  } else {
    $('#paymentCard').fadeIn();
    tables[mesa-1].paymentCard = $('#paymentCard').val();
  }
  tables[mesa-1].paymentMethod = $('#paymentMethod').val();
  socket.emit('alteredorders', [tables, mesa])
})

$('#paymentCard').on('change', function() {
  var mesa = $('#tablename').text()[5];
  tables[mesa-1].paymentCard = $('#paymentCard').val();
  socket.emit('alteredorders', [tables, mesa])
})

$('#discount').on('change keyup', function() {
  var mesa = $('#tablename').text()[5];
  if ($('#discount').val() > 100) {
    $('#discount').val(100);
  }
  tables[mesa-1].discount = $('#discount').val();
  socket.emit('alteredorders', [tables, mesa])
})

$('#tablecontainer').on('click', function() {
  $('#tablecontainer').animate({width: '100%'});
  $('#leftPanel').fadeOut();
  $('#leftPanelButton').animate(
    { deg: 0 },
    {
      duration: 200,
      step: function(now) {
        $(this).css({ transform: 'rotate(' + now + 'deg)' });
      }
    }
  );
})

//RELLENO LOS DATOS DE LA MESA QUE CLIQUEE
$('.myTable').on('click', function(e) {
  e.stopPropagation();
  var tableclicked = $(this).attr('id')[5];
  console.log(tables[tableclicked-1].orders);
  populateOrderTable(tableclicked-1);
  $('#tablename').text("Mesa " + tableclicked);
  if (tables[tableclicked-1].isOpen == true) {
    $('#opentable').hide();
    $('#closetable').show();
    $("#partyOf").val(tables[tableclicked-1].partyOf);
    $('#total').text(computeTotal());
    $('#thisTableWaiter').text('Atiende: ' + tables[tableclicked-1].waiter);
  } else {
    $('#opentable').show();
    $('#closetable').hide();
    $('#thisTableWaiter').text('');
  }
  $('#tablecontainer').animate({width: '69.5%'});
});

//RESERVATION
$('#reservetable').on('click', function() {
  var mesa = $('#tablename').text()[5];
  $('#modalReservationTime').fadeIn();
  console.log("123");
})

$('#modalReservationTime').on('click', function() {
  $('#modalReservationTime').fadeOut();
  $('#reservationclient').val('');
  $('#reservationdateInput').val('');
  $('#partyOfReservation').val('');
})
$('#reservationParameters').on('click', function(e) {
  e.stopPropagation();
})
$('#confirmReservation').on('click', function(e) {
  e.stopPropagation();
  var mesa = $('#tablename').text()[5];
  var client = $('#reservationclient').val();
  var unfDate = $('#reservationdateInput').val();
  var party = $('#partyOfReservation').val();
  var newReservation = new Reservation();
  var forDate = new Date();
  if (unfDate == '' || party == 0 || client == '') {
    customAlert('Revisar datos!');
  } else if (isTimeSlotAvailable(unfDate,mesa-1)) {
    tables[mesa-1].isReserved= true;
    forDate.setSeconds(0);
    forDate.setMinutes(unfDate.split('T')[1].split(':')[1]);
    forDate.setHours(unfDate.split('T')[1].split(':')[0]);
    forDate.setMonth(unfDate.split('-')[1]-1);
    forDate.setDate(unfDate.split('-')[2].split('T')[0]);
    forDate.setYear(unfDate.split('-')[0]);
    console.log(forDate);
    newReservation.date= forDate;
    newReservation.client = client;
    newReservation.partyOf = party;
    tables[mesa-1].reservations.push(newReservation);
    socket.emit('alteredreserv', [tables, mesa]);
    $('#modalReservationTime').fadeOut();
    $('#reservationclient').val('');
    $('#reservationdateInput').val('');
    $('#partyOfReservation').val('');
  } else {
    customAlert('Tiempo ocupado');
  }
})
$('#listReservations').on('click', function() {
    $('#modalCalendar').load('/calendar.html');
    $('#modalCalendar').fadeIn();
    $('.calendar').on('click', function(e) {
      e.stopPropagation();
    });
})
$('#modalCalendar').on('click', function () {
  $('#modalCalendar').fadeOut();
})

//LEFTPANEL
$('#leftPanelButton').on('click', function(e) {
  e.stopPropagation();
  $('#leftPanelButton').animate(
    { deg: 60 },
    {
      duration: 200,
      step: function(now) {
        $(this).css({ transform: 'rotate(' + now + 'deg)' });
      }
    }
  );
  $('#leftPanel').fadeIn()
})

setInterval(function () {
  currentTime = new Date();
}, 1000)

$("#resetTablesOrders").hover(
  function() {
    $('#leftPanelDetailCleanOrders').fadeIn();
  }, function() {
    $('#leftPanelDetailCleanOrders').fadeOut();
  }
);

$("#resetTablesReservations").hover(
  function() {
    $('#leftPanelDetailCleanreservations').fadeIn();
  }, function() {
    $('#leftPanelDetailCleanreservations').fadeOut();
  }
);

$("#CloseAllTables").hover(
  function() {
    $('#leftPanelDetailCloseTables').fadeIn();
  }, function() {
    $('#leftPanelDetailCloseTables').fadeOut();
  }
);

$("#listReservations").hover(
  function() {
    $('#leftPanelDetailListReservations').fadeIn();
  }, function() {
    $('#leftPanelDetailListReservations').fadeOut();
  }
);

$("#settings").hover(
  function() {
    $('#leftPanelSettings').fadeIn();
  }, function() {
    $('#leftPanelSettings').fadeOut();
  }
);

$('#waiters').on('change', function() {
  $('#waiterPIN').focus();
})
$('#waiterPIN').keyup(function () {
  if (event.keyCode === 13) {
      $("#waiterLogin").click();
  }
})
$('#waiterLogin').on('click', function(){
  //VALIDATE PIN
  var pin = $('#waiterPIN').val();
  var waiter = $('#waiters').val();
  socket.emit('login', [waiter,pin])
  $('#modalWaiter').fadeOut();
  $('#waiterPIN').off();
  $('#waiters').off();
  document.body.requestFullscreen();
})

$(document).ready(function() {$('.preloader').fadeOut()});

$(function() {
  socket.on('pong', function() {
    console.log('Pong');
  })
  socket.on('logResponse', function(res) {
    if (res == true) {
      currentWaiter = $('#waiters').val();
    } else {
      alert('PIN incorrecto!');
      window.location.reload();
    }
  })
  socket.on('tableopenedres', function(table){
    console.log('Mesa '+ table[0] + ' abierta');
    tables[table[0]-1].isOpen = true;
    tables[table[0]-1].waiter = table[1];
    $('#table' + table[0]).css('background-color', '#22cc22');
    tables[table[0]-1].timer.setTime(currentTime);
    setClock(table[0]-1);
    $('#clock' + table[0]).fadeIn();
    if ($('#tablename').text()[5] == table[0]) {
      $('#opentable').fadeOut('fast');
      $('#closetable').fadeIn('fast');
      console.log(table[1]);
      $('#thisTableWaiter').text('Atiende: ' + table[1]);
    }
    openNotification.play();
  });
  socket.on('tableclosedres', function(num){
    console.log('Mesa ' + num + ' cerrada');
    tables[num-1].isOpen = false;
    tables[num-1].orders = [];
    tables[num-1].partyOf = 1;
    tables[num-1].paymentMethod = "cash";
    tables[num-1].paymentCard = "";
    tables[num-1].discount = 0;
    $('#table' + num).css('background-color', '#000000');
    $('#clock' + num).fadeOut();
    if ($('#tablename').text()[5] == num) {
      $('#opentable').fadeIn('fast');
      $('#closetable').fadeOut('fast');
      $('#thisTableWaiter').text('');
      $('#paymentMethod').val('cash');
      $('#paymentCard').hide();
      $('#discount').val('');
    }
    closedNotification.play();
  });
  socket.on('alteredordersres', function(newData) {
    console.log('Ordenes alteradas de mesa ' + newData[0]);
    console.log('Orden ' + newData[1].orders);
    tables[newData[0]-1].orders = newData[1].orders;
    tables[newData[0]-1].partyOf = newData[1].partyOf;
    tables[newData[0]-1].paymentMethod = newData[1].paymentMethod;
    tables[newData[0]-1].paymentCard = newData[1].paymentCard;
    tables[newData[0]-1].discount = newData[1].discount;
    if ($('#tablename').text()[5] == newData[0]) {
      populateOrderTable(newData[0]-1);
      $('#total').text(computeTotal());
      $('#partyOf').val(newData[1].partyOf);
    }
    tables[newData[0]-1].total = computeTotal();
    orderNotification.play();
  })
  socket.on('alteredreservres', function(newData) {
    console.log('Se reservo la mesa ' + newData[0]);
    console.log(newData[1].reservations);
    tables[newData[0]-1].reservations = newData[1].reservations;
    if(newData[1].isReserved == true) {
      tables[newData[0]-1].isReserved = true;
      $('#reserved' + newData[0]).fadeIn('fast');
    } else {
      $('#reserved' + newData[0]).fadeOut('fast');
    }
    orderNotification.play();
  })
  socket.on('removeReservationRes', function(newData) {
    console.log('Se elimino reserva de mesa ' + newData[0]);
    tables[newData[0]-1].reservations = newData[1].reservations;
    if(newData[1].isReserved == true) {
      tables[newData[0]-1].isReserved = true;
      $('#reserved' + newData[0]).fadeIn('fast');
    } else {
      $('#reserved' + newData[0]).fadeOut('fast');
    }
    orderNotification.play();
  })
  socket.on('resetTablesOrdersRes', function(newData) {
    console.log('Se borraron todos los pedidos de las mesas');
    resetNotification.play();
  })
  socket.on('resetTablesReservationsRes', function(newData) {
    console.log('Se borraron todos las reservas de las mesas');
    for (var i = 0; i<tables.length; i++){
      $('#reserved' + Number(i+1)).fadeOut();
    }
    resetNotification.play();
  })
  socket.on('closeAllTablesRes', function(){
    console.log('Se han cerrado todas las mesas');
    for (var i = 0; i<tables.length; i++){
      tables[i].orders = [];
      tables[i].isOpen = false;
      tables[i].waiter = "";
      tables[i].partyOf = 1;
      tables[i].paymentMethod = "cash";
      tables[i].paymentCard = "";
      tables[i].discount = 0;
      $('#table' + Number(i+1)).css('background-color', '#000000');
      $('#clock' + Number(i+1)).fadeOut();
    }
    $('#opentable').fadeIn('fast');
    $('#closetable').fadeOut('fast');
    resetNotification.play();
  });
  socket.on('reservationExpired', function(i) {
    console.log('Expiró reserva de mesa ' + i);
    $.getJSON("/tables.json", function(response) {
      tables[i].isReserved = response[i].isReserved;
      tables[i].reservations = response[i].reservations;
      if(tables[i].isReserved == false) {
        $('#reserved' + Number(i+1)).fadeOut('fast');
      }
    });
  });
})

Object.defineProperty(console, '_commandLineAPI',
 { get : function() { throw 'Nooo!' } })
