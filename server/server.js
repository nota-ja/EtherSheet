/****************************************
 * Initializers, include nesseccary packages
 * and set up constants
 ****************************************/
var es = {};

// includes
var express = require('express');
var io = require('socket.io');
var mysql = require('mysql');
var path = require('path');
var fs = require('fs');
var Emitter = require('events').EventEmitter;
var emitter = new Emitter();

// constants
var PORT = 8080

var HTTPS_KEY = './snakeoil.key';
var HTTPS_CERT = './snakeoil.crt';

var MYSQL_DATABASE = 'ethersheet';
var MYSQL_TABLE = 'sheets';
var MYSQL_USER = 'ethersheet';
var MYSQL_PASS = 'ethersheet';
var MYSQL_HOST = 'localhost';

var sheets = {}
/*************************************************
 * bootstrap https connetctions and mysql connections
 *************************************************/

// PLEASE PLEASE PLEASE deploy this for production with the self
// signed cert.  It would be a REALLY BAD IDEA
var httpsopts = {
  key: fs.readFileSync(HTTPS_KEY),
  cert: fs.readFileSync(HTTPS_CERT)
}
var app = express.createServer(httpsopts)
  , io = io.listen(app);

// bootstrap mysql
es.sql = mysql.createClient({
  user: MYSQL_USER,
  password: MYSQL_PASS,
  host: MYSQL_HOST,
  database: MYSQL_DATABASE,
});

//express settings
app.set('view options', {
    layout: false
});
app.use(express.static(__dirname + '/public'));
app.use(express.logger({ format: ':method :url' }));
app.use(express.bodyParser());

/**********************************************
 * routes
 **********************************************/

//index
app.get('/', function(req,res){
  res.render('index.ejs');
});

// save the sheet
app.post('/save', function(req,res){
  es.save_sheet(req.body.sheet_id, req.body.sheet_data);
  res.send(req.body.sheet_id);
});

//get the sheet in json form
app.get('/s/:sheetid.json', function(req,res){
  es.initialize_sheet(req.params.sheetid);
  emitter.on('sheet_ready', function(){
    res.send(es.sheet_data.sheetdata);
  });
});

// sheet entry page
app.get('/s/:sheetid', function(req,res){
  res.render('jquery.sheet.ejs', {sheet_title: req.params.sheetid});
});

/***********************************************
 * Socket.io listeners
 ***********************************************/
io.sockets.on('connection', function(socket){

  socket.on('JOIN_ROOM', function(data){
    es.add_user_to_room(data.user_id, data.sheet_id) 
    io.sockets.in(data.sheet_id).emit('USER_CHANGE', {user_id: data.user_id, action: 'JOINED', sheet_data:sheets[data.sheet_id]});
  });
  
  //use this for messages that are passed only to other clients
  //and don't need to interact with the server.
  socket.on('message', function(data){
    socket.broadcast.to(socket.sheet_id).emit('message', data);
  }

  socket.on('disconnect', function(){
    socket.leave(socket.sheet_id);
    sheets[socket.sheet_id].count--
    delete(sheets[socket.sheet_id].users[socket.user_id])
    console.log('user ' + socket.user_id + ' LEFT room ' + socket.sheet_id);
    io.sockets.in(socket.sheet_id).emit('USER_CHANGE', {user_id: socket.user_id, action: 'LEFT', sheet_data:sheets[socket.sheet_id]});
  });

});
/***********************************************
 * Fire the canons!!
 ***********************************************/
app.listen(PORT, function(){
  console.log('ethersheet is listening over https on port ' + PORT);
});

/***********************************************
 * utitilty functions
 ***********************************************/
es.add_user_to_room = function(user_id, sheet_id){
  sheets[sheet_id] = sheets[sheet_id] || {count:0, users:{}}
  sheets[sheet_id].count++
  socket.user_id = user_id
  socket.sheet_id = sheet_id
  socket.nickname = ''
  socket.color = es.get_color(sheets[sheet_id].count);
  sheets[sheet_id].users[user_id] = socket
  console.log('user ' + socket.user_id + ' joined room ' + socket.sheet_id);
  socket.join(sheet_id);
};

es.get_color = function(count){
  var colors = [
    '#1BA5E0',
    '#0EF012',
    '#F283F0',
    '#DFF25E',
    '#FAA166',
    '#FC3F52'
  ];
  return colors[count % colors.length]
};

es.save_sheet = function(sheet_id, sheet_data){
  es.sql.query('UPDATE sheets SET sheetdata = ? WHERE sheetid = ?', [sheet_data, sheet_id],
                function(err, results, fields){
                  if(err){
                    console.log('ERROR: ' + err);
                  }
                });
};

es.initialize_sheet = function(sheet_id){
  es.sql.query('SELECT * FROM sheets WHERE sheetid = ?', 
                [sheet_id], 
                function selectCb(err, results, fields) {
                  if(err) {
                    throw err;
                  }
                  if(results.length > 0){ // a sheet exists
                    //load the data and emit an event
                    es.sheet_data = results[0];
                    emitter.emit('sheet_ready');
                  } else {
                    //create a new sheet
                    es.create_sheet(sheet_id);
                  }
                }
              );

};

es.create_sheet = function(sheet_id){
  es.sql.query('INSERT INTO sheets VALUES (?, ?)',
                [sheet_id, es.default_sheetdata],
                function selectCb(err, results, fields){
                  if(err) {
                    throw err;
                  }
                  es.sheet_data = {sheetid: sheet_id, sheetdata: es.default_sheetdata} ;
                  emitter.emit('sheet_ready');
                }
              )
}; 
es.default_sheetdata = '[{"metadata":{"columns":5,"rows":15,"title":"","col_widths":{"c0":"120","c1":"120","c2":"120","c3":"120","c4":"120"}},"data":{"r0":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r1":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r2":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r3":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r4":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r5":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r6":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r7":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r8":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r9":{"h":"18px","c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r10":{"c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r11":{"c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r12":{"c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r13":{"c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}},"r14":{"c0":{"value":"","colspan":null,"cl":""},"c1":{"value":"","colspan":null,"cl":""},"c2":{"value":"","colspan":null,"cl":""},"c3":{"value":"","colspan":null,"cl":""},"c4":{"value":"","colspan":null,"cl":""}}}}]';
