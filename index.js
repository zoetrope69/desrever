var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var shortid = require('shortid');

var usernames = {};

var words = [
  { id: 1, word: 'shaggy', points: 200 },
  { id: 3, word: 'yes', points: 300 },
  { id: 5, word: 'poo', points: 250 },
  { id: 8, word: 'maloy', points: 100 },
  { id: 7, word: 'hello', points: 250 },
  { id: 10, word: 'oatibix', points: 100 }
];

server.listen(3000);
console.log('listening on localhost:3000');

app.use(express.static('public'));

app.get('*', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

function newWord(socket) {
  var randNo = Math.floor(Math.random() * words.length);
  console.log(randNo);
  var randomWord = words[randNo];
  socket.word = randomWord;
  socket.emit('word', randomWord);
}

// io.on('connection', function(socket){
//   socket.on('say to someone', function(id, msg){
//     socket.broadcast.to(id).emit('my message', msg);
//   });
// });

io.on('connection', function(socket){

  console.log('a user connected', socket);

  socket.on('room', function(room) {
    socket.join(room);
  });

  io.sockets.emit('users', usernames);

  socket.on('audio', function(data){
    console.log('sent w audio', socket.word);
    console.log('audio: ', data);
    newWord(socket);
    socket.broadcast.emit('audio', socket.username, socket.word, data);
  });

  socket.on('addUser', function(username){

    io.sockets.in('asda').emit('info', 'big boys');
    socket.username = username;
    console.log('username: ' + username);
    usernames[username] = username;
    console.log(usernames);
    io.sockets.emit('users', usernames);
    socket.broadcast.emit('info', socket.username + ' has connected');
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
    delete usernames[socket.username];
    io.sockets.emit('users', usernames);
    socket.broadcast.emit('info', socket.username + ' has disconnected');
  });

});
