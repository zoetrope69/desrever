var socket = io.connect();

socket.on('connect', function(){
  var room = window.location.pathname.split('/')[1];
  console.log('room', room);
  socket.emit('room', room);

  socket.emit('addUser', prompt("What's your name: "));
});

socket.on('word', function(data){
  document.querySelector('#ready').checked = false;
  document.querySelector('.word').innerHTML = data.word;
});

socket.on('users', function (users) {
  var output = '<h2>Connected users:</h2><ul>';
  for (username in users) {
    output += '<li>'+ username + '</li>';
  }
  output += '</ul>';
  document.querySelector('.users').innerHTML = output;
});

socket.on('info', function (text) {
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(text));
  document.querySelector('.info').appendChild(li);
});

socket.on('audio', function(username, word, arrayBuffer) {
  var guesses = document.querySelector('.guesses');
  var wordGuessOutput = document.querySelector('.wordGuessOutput');

  guesses.innerHTML = '';

  var button = document.createElement('button');
  button.appendChild(document.createTextNode(word.word));
  button.addEventListener('click', function(){
      wordGuessOutput.innerHTML = 'correct, ' + username + ' got ' + word.points + 'points';
      guesses.innerHTML = '';
  });
  guesses.appendChild(button);


  for (var i = 0; i < 4; i++) {
    var button = document.createElement('button');
    button.appendChild(document.createTextNode('not the answer'));
    button.addEventListener('click', function(){
      wordGuessOutput.innerHTML = 'wrong, it was meant to be' + word.word;
      guesses.innerHTML = '';
    });
    guesses.appendChild(button);
  }

  reverseAudio(arrayBuffer);
});

var audio_context;
var recorder;
var volume;
var volumeLevel = 0;
var context = new AudioContext();

function reverseAudio(arrayBuffer){
  context.decodeAudioData(arrayBuffer, function(buffer) {
    var source = context.createBufferSource();
    Array.prototype.reverse.call( buffer.getChannelData(0) );
    Array.prototype.reverse.call( buffer.getChannelData(1) );

    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
  });
}

function startUserMedia(stream) {
  var input = audio_context.createMediaStreamSource(stream);
  console.log('Media stream created.');

  volume = audio_context.createGain();
  volume.gain.value = volumeLevel;
  input.connect(volume);
  volume.connect(audio_context.destination);
  console.log('Input connected to audio context destination.');

  recorder = new Recorder(input);
  console.log('Recorder initialised.');
}

function changeVolume(value) {
  if (!volume) return;
  volumeLevel = value;
  volume.gain.value = value;
}

function startRecording() {
  recorder && recorder.record();
  document.querySelector('.button--record').innerHTML = 'Recording...';
  console.log('Recording...');
}

function stopRecording() {
  var recordButton = document.querySelector('.button--record');
  recorder && recorder.stop();
  recordButton.innerHTML = 'Record!';
  console.log('Stopped recording.');

  // create WAV download link using audio data blob
  createDownloadLink();

  recorder.clear();
}

function createDownloadLink() {
  recorder && recorder.exportWAV(function(blob) { handleWAV(blob); });
}

function handleWAV(blob) {
  var url = URL.createObjectURL(blob);

  var audioElement = document.createElement('audio');

  audioElement.controls = true;
  audioElement.src = url;

  var arrayBuffer;
  var fileReader = new FileReader();
  fileReader.onload = function() {
    arrayBuffer = this.result;

    var readyCheckbox = document.querySelector('#ready');
    if (readyCheckbox.checked) {
      socket.emit('audio', arrayBuffer);
    } else {
      reverseAudio(arrayBuffer);
    }
  };
  fileReader.readAsArrayBuffer(blob);
}

window.onload = function init() {
  try {
    // webkit shim
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL;

    audio_context = new AudioContext();
    console.log('Audio context set up.');
    console.log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
  } catch (e) {
    console.warn('No web audio support in this browser!');
  }

  navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
    console.warn('No live audio input: ' + e);
  });

  var recordButtonEl = document.querySelector('.button--record');
  recordButtonEl.addEventListener('mousedown', startRecording);
  recordButtonEl.addEventListener('mouseup', stopRecording);
};
