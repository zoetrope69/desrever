var game = function() {
  var Recorder = require('recorderjs');
  var io = require('socket.io-client');
  var debounce = require('underscore').debounce;
  var utils = require('./utils');
  var hark = require('hark');

  navigator.getUserMedia({ audio: true }, startUserMedia, function(e) {
    utils.displayError('Cant get user media');
    console.warn('No live audio input: ' + e);
  });

  function startUserMedia(stream) {
    var maxPlayers = 4;
    var socket = io.connect();

    try {
      var audioContext = new AudioContext();
      console.log('Audio context set up.');
    } catch (e) {
      console.log(e);
      var message = 'No web audio support in this browser!';
      utils.displayError(message);
      console.warn(message, e);
    }

    var recordButtonEl = document.querySelector('.button--record');
    var recordButtonTextEl = document.querySelector('.button--record__text');
    var readyToggleEl = document.querySelector('.checkbox--record');
    var wordEl = document.querySelector('.word');
    var roomUrlEl = document.querySelector('.room-url__url');
    var copiedToClipboardEl = document.querySelector('.room-url__message');
    var waveEl = document.querySelector('.wave');
    var startGameEl = document.querySelector('.button--start_game');
    var currentPlayer = {};

    var speechEvents = hark(stream, {});

    speechEvents.on('speaking', function() {
      currentPlayer.speaking = true;
      socket.emit('updatePlayer', currentPlayer);
    });

    speechEvents.on('stopped_speaking', function() {
      currentPlayer.speaking = true;
      socket.emit('updatePlayer', currentPlayer);
    });

    document.querySelector('.inputName').oninput = function(event) {
      currentPlayer.name = event.target.value;
      socket.emit('updatePlayer', currentPlayer);
    };

    document.querySelector('.readyUp').addEventListener('click', function(event){
      currentPlayer.ready = event.target.checked;
      socket.emit('updatePlayer', currentPlayer);
    });

    // when clicking into the room url textarea select and copy to clipboard
    roomUrlEl.addEventListener('click', function(){
      roomUrlEl.select();

      var successfulCopy = document.execCommand('copy');
      if (successfulCopy){
        copiedToClipboardEl.classList.remove('room-url__message--hidden');
        setTimeout(function() {
          copiedToClipboardEl.classList.add('room-url__message--hidden');
        }, 1000);
      }
    });

    socket.on('connect', function(){
      var room = window.location.pathname.split('/')[1];
      socket.emit('room', room);

      var id = utils.makeId();
      currentPlayer.id = id;
      currentPlayer.name = id;
      socket.emit('newPlayer', currentPlayer);
    });

    socket.on('players', function (players) {
      console.log(players);
      var playersReadyTotal = 0;
      if (players) {
        for (var i = 0; i < maxPlayers; i++) {
          var player = players[i];
          var playerEl = document.querySelector('.player--' + (i + 1));

          if(!player) {
            playerEl.classList.add('player--waiting');
            playerEl.querySelector('.player__name').innerHTML = '<small>Waiting for player...</small>';
          } else {

            if (currentPlayer.id === player.id) {
              currentPlayer = player;
            }

            if (player.speaking) {
              playerEl.classList.add('player--speaking');
            } else {
              playerEl.classList.remove('player--speaking');
            }

            playerEl.classList.remove('player--waiting');
            playerEl.querySelector('.player__name').innerHTML = '' + player.name + (player.name === currentPlayer.name ? '<small>You!</small>' : '');


            if (player.ready) {
              playersReadyTotal++;
              playerEl.querySelector('.ready').innerHTML = 'Ready!';
            } else {
              playerEl.querySelector('.ready').innerHTML = '';
            }
          }
        }

        if (currentPlayer.host) {
          startGameEl.classList.remove('hide');
        } else {
          startGameEl.classList.add('hide');
        }

        if (playersReadyTotal >= 2 && playersReadyTotal === players.length) {
          startGameEl.classList.remove('disabled');
          startGameEl.setAttribute('disabled', false);
        } else {
          startGameEl.classList.add('disabled');
          startGameEl.setAttribute('disabled', true);
        }
      }
    });

    socket.on('info', function (text) {
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(text));
      document.querySelector('.info').appendChild(li);
    });

    socket.on('recieveAudio', function(playerName, word, blob) {
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

       var waveSVG = utils.waveSVG(buffer, 500, 100);
       waveEl.appendChild(waveSVG);
     });
    }

    var recordingTimer;

    function startRecording(recorder) {
      console.log('Recording...');
      recordButtonTextEl.innerHTML = 'Recording...';
      recordButtonEl.classList.add('button--record--recording');

      waveEl.innerHTML = '<div class="wave__recording"></div>';

      recordingTimer = window.setTimeout(function() {
        console.log('memees');
        stopRecording(recorder);
      }, 5 * 1000); // in 5 secs stop recording

      recorder.record();
    }

    function stopRecording(recorder) {
      console.log('Stopped recording.');
      recordButtonTextEl.innerHTML = 'Record!';
      recordButtonEl.classList.remove('button--record--recording');

      window.clearTimeout(recordingTimer);

      waveEl.innerHTML = '';

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
};

module.exports = game;
