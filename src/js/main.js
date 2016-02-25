function displayError(message) {
  var errorMessage = document.querySelector('.error-message');
  errorMessage.innerHTML = message;
  errorMessage.style.display = 'block';
}

function makeId() {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for(var i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

function game() {
  navigator.getUserMedia({ audio: true }, startUserMedia, function(e) {
    displayError('Cant get user media');
    console.warn('No live audio input: ' + e);
  });

  function startUserMedia(stream) {
    var socket = io.connect();
    var audioContext = new AudioContext();
    console.log('Audio context set up.');

    var recordButtonEl = document.querySelector('.button--record');
    var readyToggleEl = document.querySelector('.checkbox--record');
    var wordEl = document.querySelector('.word');

    socket.on('connect', function(){
      var room = window.location.pathname.split('/')[1];
      socket.emit('room', room);

      socket.emit('newUser', makeId());
    });

    socket.on('newWord', function(data){
      readyToggleEl.checked = false;
      wordEl.innerHTML = data.word;
    });

    socket.on('users', function (users, you) {
      var output = '<h2>Connected users:</h2><ul>';
      for (var i = 0; i < users.length; i++) {
        var user = users[i];
        output += '<li>'+ user + (user === you ? '<small>You!</small>' : '') + '</li>';
      }
      output += '</ul>';
      document.querySelector('.users').innerHTML = output;
    });

    socket.on('info', function (text) {
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(text));
      document.querySelector('.info').appendChild(li);
    });

    socket.on('recieveAudio', function(username, word, blob) {
      console.log(username, word, blob);
      reverseAudio(blob);
    });

    var input = audioContext.createMediaStreamSource(stream);
    console.log('Media stream created.');

    volume = audioContext.createGain();
    volume.gain.value = 0;
    input.connect(volume);
    volume.connect(audioContext.destination);
    console.log('Input connected to audio context destination.');

    var recorder = new Recorder(input);
    console.log('Recorder initialised.');

    if (recordButtonEl) {
      recordButtonEl.addEventListener('mousedown', function(){ startRecording(recorder) });
      recordButtonEl.addEventListener('mouseup', function(){ stopRecording(recorder) });
    }

    function reverseAudio(arrayBuffer) {
      audioContext.decodeAudioData(arrayBuffer, function(buffer) {
       var source = audioContext.createBufferSource();
       Array.prototype.reverse.call( buffer.getChannelData(0) );
       Array.prototype.reverse.call( buffer.getChannelData(1) );

       source.buffer = buffer;
       source.connect(audioContext.destination);
       source.start(0);
     });
    }

    function startRecording(recorder) {
      console.log('Recording...');
      recordButtonEl.innerHTML = 'Recording...';

      recorder.record();
    }

    function stopRecording(recorder) {
      console.log('Stopped recording.');
      recordButtonEl.innerHTML = 'Record!';

      recorder.stop();
      recorder.exportWAV(handleAudio);
      recorder.clear();
    }

    function handleAudio(blob) {
      var fileReader = new FileReader();
      fileReader.onload = function() {
        var arrayBuffer = this.result;

        if (readyToggleEl.checked) {
          socket.emit('sendAudio', arrayBuffer);
        } else {
          reverseAudio(arrayBuffer);
        }
      };
      fileReader.readAsArrayBuffer(blob);
    }
  }
}

function lobby() {
  var joinRoomInput = document.querySelector('.join-room__input');
  var joinRoomButton = document.querySelector('.join-room__button');
  joinRoomButton.setAttribute('disabled', true);
  joinRoomInput.addEventListener('input', function(event) {
    var roomInput = event.target.value;

    var hasUrl = roomInput.indexOf(window.location.origin) > -1;
    var hasRoom = roomInput.length > window.location.origin.length + 1;

    // if a valid url then change the button
    if (hasUrl && hasRoom) {
      joinRoomButton.setAttribute('disabled', false);
      joinRoomButton.setAttribute('href', roomInput);
      joinRoomButton.classList.remove('disabled');
    } else {
      joinRoomButton.setAttribute('href', '#');
      joinRoomButton.setAttribute('disabled', true);
      joinRoomButton.classList.add('disabled');
    }
  });
}

function ready() {
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL;

    console.log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));

    // check if there's a room specified in the url
    var room = window.location.pathname.split('/')[1];

    if (room) {
      game();
    } else {
      lobby();
    }
  } catch (e) {
    var message = 'No web audio support in this browser!';
    displayError(message);
    console.warn(message, e);
  }
};

document.addEventListener('DOMContentLoaded', ready, false);
