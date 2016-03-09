"use strict";
var express = require('express');
var app = express();
var exphbs  = require('express-handlebars');
var server = require('http').Server(app);
var io = require('socket.io')(server);

var randomWord = require('random-word');

var rooms = {};

//use player class
var Player = require('./objects/Player');

// server on port
var port = process.env.PORT || 3000;
server.listen(port);
console.log('Listening on localhost:' + port);

// dist directory holds all static assets served up
app.use(express.static('dist'));

// using handlebars for templatin
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// every request we get
app.get('/', function (req, res) {
  var newWord = randomWord();
  var newWordReversed = newWord.split('').reverse().join('');
  var room = `${newWord}-${newWordReversed}`;
  rooms[room] = { players: [] };
  res.render('home', { room });
});

// every request we get
app.get('/:room', function (req, res) {
  var room = req.params.room;
  var url = req.protocol + '://' + req.get('host') + req.originalUrl;
  res.render('game', { room, url });
});

// every request we get
app.get('/game', function (req, res) {
  // send back the index.html file
  res.sendFile(__dirname + '/game.html');
});

var words = [
  { id: 1, word: 'shaggy', points: 200 },
  { id: 2, word: 'boogie butts', points: 200 },
  { id: 3, word: 'yes', points: 300 },
  { id: 4, word: 'oatibix', points: 100 }
];

// generate a new word
function newWord(socket) {
  // get a random word from the list
  var randNo = Math.floor(Math.random() * words.length);
  var randomWord = words[randNo];

  // and assign it to the socket and send it to the client
  socket.word = randomWord;
  socket.emit('newWord', randomWord);
}

// when player connects
io.on('connection', function(socket){
  console.log('a player connected');

  // if a room is sent to the server
  socket.on('room', function(room) {
    // assign room to socket and join it
    socket.room = room;
    socket.join(room);
  });

  // when sent audio to server
  socket.on('sendAudio', function(data){
    // send everyone but current player the audio
    socket.broadcast.in(socket.room).emit('recieveAudio', socket.player.name, socket.word, data);

    // send some info about what happened
    socket.broadcast.in(socket.room).emit('info', socket.player.name + ' sent some audio');

    // finished with old word so assign new word
    newWord(socket);
  });

  socket.on('newPlayer', function(player){
    // assign playerName to socket
    socket.player = new Player(player);

    // add playerName to current players list in room
    rooms[socket.room] = rooms[socket.room] || { players: [] }; // default to empty if no players

    if(rooms[socket.room].players.length === 0){
      socket.player.setHost(true);
    }

    rooms[socket.room].players.push(socket.player);
    var players = rooms[socket.room].players;

    // assign new word
    newWord(socket);

    // update playerName list on everyone's client
    io.sockets.in(socket.room).emit('players', players);

    // send some info about what happened
    socket.broadcast.in(socket.room).emit('info', socket.player.name + ' has connected');
  });

  socket.on('updatePlayer', function(data){
    data = data || {};

    var index = rooms[socket.room].players.indexOf(socket.player);
    var player = rooms[socket.room].players[index];

    // get current player
    for(var property in data){
      if (player.hasOwnProperty(property)){
        player[property] = data[property];
      }
    }

    var players = rooms[socket.room].players;

    // update playerName list on everyone's client
    io.sockets.in(socket.room).emit('players', players);
  });

  // if player disconnects
  socket.on('disconnect', function(){
    if (rooms[socket.room] && rooms[socket.room].players.length) {
      console.log(socket.player.name + ' disconnected');

      // remove player from current players list in room
      var currentPlayers = rooms[socket.room].players;
      var index = currentPlayers.indexOf(socket.player);
      // if player is in the array
      if (index > -1) {
        // removes player from array
        rooms[socket.room].players.splice(index, 1);
      }
      var players = rooms[socket.room].players;

      // update player list on everyone's client
      io.sockets.in(socket.room).emit('players', players);

      // send some info about what happened
      socket.broadcast.in(socket.room).emit('info', socket.player.name + ' has disconnected');
    }
  });

});
