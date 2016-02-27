var express = require('express');
var app = express();
var exphbs  = require('express-handlebars');
var server = require('http').Server(app);
var io = require('socket.io')(server);

var randomWord = require('random-word');

var rooms = {};

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
  rooms[room] = { users: [] };
  res.render('home', { room });
});

// every request we get
app.get('/:room', function (req, res) {
  var room = req.params.room;

  // is there a room
  // send over the users to the room

  res.render('game', { room, host: 'http://localhost:'+port });
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

// when user connects
io.on('connection', function(socket){
  console.log('a user connected');

  // if a room is sent to the server
  socket.on('room', function(room) {
    // assign room to socket and join it
    socket.room = room;
    socket.join(room);
  });

  // when sent audio to server
  socket.on('sendAudio', function(data){
    // send everyone but current user the audio
    socket.broadcast.in(socket.room).emit('recieveAudio', socket.username, socket.word, data);

    // send some info about what happened
    socket.broadcast.in(socket.room).emit('info', socket.username + ' sent some audio');

    // finished with old word so assign new word
    newWord(socket);
  });

  socket.on('newUser', function(username){
    // assign username to socket
    socket.username = username;

    // add username to current users list in room
    rooms[socket.room] = rooms[socket.room] || { users: [] }; // default to empty if no users
    rooms[socket.room].users.push(username);
    var users = rooms[socket.room].users;

    // assign new word
    newWord(socket);

    // update username list on everyone's client
    io.sockets.in(socket.room).emit('users', users);

    // send some info about what happened
    socket.broadcast.in(socket.room).emit('info', socket.username + ' has connected');
  });

  // if user disconnects
  socket.on('disconnect', function(){
    console.log(socket.username + ' disconnected');

    if (rooms[socket.room]) {
      // remove username from current users list in room
      var currentUsers = rooms[socket.room].users;
      var index = currentUsers.indexOf(socket.username);
      // if user is in the array
      if (index > -1) {
        // removes user from array
        rooms[socket.room].users.splice(index, 1);
      }
      var users = rooms[socket.room].users;

      // update username list on everyone's client
      io.sockets.in(socket.room).emit('users', users);

      // send some info about what happened
      socket.broadcast.in(socket.room).emit('info', socket.username + ' has disconnected');
    }
  });

});
