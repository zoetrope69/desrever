var game = function() {
  var io = require('socket.io-client');
  var debounce = require('underscore').debounce;
  var utils = require('./utils');
  var audio = require('./audio');
  var hark = require('hark');
  var audio = require('./audio');
  var getUserMedia = require('./getusermedia');
  
  var socket = io.connect();

  var maxPlayers = 4;
  var currentPlayer = {};

  var sourceBuffer; // sound source buffer
  var source; // currently playing source node
  var reducer; // noise reducer unit
  var meter; // level meter
  var gain; // master gain

  // create the nodes
  reducer = new audio.NoiseReducer(1, 20);
  meter = new audio.Meter();
  gain = audio.context.createGain();

  // create the audio graph: (source ->) gain -> reducer -> meter -> output
  gain.connect(reducer.input);
  reducer.output.connect(meter.node);
  meter.node.connect(audio.context.destination);

  var playing = false; // stores whether the audio is playing or not

  // noise reducer presets
  var presets = [
    {
      name: 'BG Noise/Rumble 1',
      freqs: [164, 200, 191, 677, 1014, 2858, 6240],
      types: ['highpass', 'peaking', 'notch', 'notch', 'notch', 'notch', 'lowpass'],
    },
    {
      name: 'BG Noise/Rumble 2',
      freqs: [144, 986],
      types: ['highpass', 'notch'],
      Qs: [1, 0.5]
    },
    {
      name: 'Low Volume 1',
      freqs: [194, 524, 2675, 4058],
      types: ['highpass', 'peaking', 'notch', 'peaking'],
      Qs: [1, 1, 0.5, 1],
      gains: [1, 16, 1, 20]
    },
    {
      name: 'Low Volume 2',
      freqs: [194, 524, 1600, 6000],
      types: ['highpass', 'peaking', 'notch', 'peaking'],
      Qs: [1, 2, 1, 2],
      gains: [1, 16, 1, 20]
    }
  ];

  // elements
  var recordButtonEl = document.querySelector('.button--record');
  var recordButtonTextEl = document.querySelector('.button--record__text');
  var readyToggleEl = document.querySelector('.checkbox--record');
  var wordEl = document.querySelector('.word');
  var roomUrlEl = document.querySelector('.room-url__url');
  var copiedToClipboardEl = document.querySelector('.room-url__message');
  var waveEl = document.querySelector('.wave');
  var startGameEl = document.querySelector('.button--start_game');
  var nameInputEl = document.querySelector('.inputName');
  var readyUpEl = document.querySelector('.readyUp');
  var reducerCheckboxEl = document.getElementById("inp_useReducer");
  var gainInputEl = document.getElementById('inp_gain');
  var presetInputEl = document.getElementById('inp_preset');
  var presetInputTextEl = document.getElementById('preset');

  var stateLobby = document.querySelector('.state--lobby');
  var stateGame = document.querySelector('.state--game');

  startGameEl.addEventListener('click', function(){
    console.log('startgameclick');
    if (!startGameEl.classList.contains('button--start_game--disabled')) {
      socket.emit('setState', 'game');
    }
  });

  function changeToGame() {
    stateLobby.style.display = 'none';
    stateGame.style.display = 'block';
  }

  // sets the EQ preset
  function setEQPreset(num) {
    var preset = presets[num];
    if (preset.freqs) reducer.eq.setBandFrequencies(preset.freqs);
    if (preset.types) reducer.eq.setBandTypes(preset.types);
    if (preset.Qs) reducer.eq.setQValues(preset.Qs);
    if (preset.gains) reducer.eq.setBandGains(preset.gains);
  }

  // play the audio
  function playAudio() {
    // reset the meter & set playing to true
    meter.reset();
    playing = true;

    // create source node, connect it to the audio graph, and start it
    source = audio.context.createBufferSource();
    source.buffer = sourceBuffer;
    source.connect(gain);
    source.start(0);
  }

  // stops the currently playing source node
  function stopAudio() {
    source.stop(0);
    source.disconnect(0);
    playing = false;
  }

  // record sound from the microphone
  function record(recorder) {
    recordButtonTextEl.innerHTML = 'Recording...';
    recordButtonEl.classList.add('button--record--recording');

    waveEl.innerHTML = '<div class="wave__recording"></div>';

    recorder.startRecording();

    window.setTimeout(function() {
      recorder.stopRecording(function(buffer) {
        var reversedBuffer = audio.reverseBuffer(buffer);
        sourceBuffer = reversedBuffer;

        waveEl.innerHTML = '';

        var waveSVG = utils.waveSVG(sourceBuffer, 500, 100);
        waveEl.appendChild(waveSVG);

        recordButtonTextEl.innerHTML = 'Record!';
        recordButtonEl.classList.remove('button--record--recording');

        playAudio();
      });
    }, 5000);
  }

  // changes the gain when the slider is moved
  function onGainChanged(event) {
    gain.gain.value = parseFloat(event.target.value) / 10;
  }

  // toggles the use of the reducer
  function onReducerToggled(event) {
    var useReducer = reducerCheckboxEl.checked;
    reducer.bypass(!useReducer);
  }

  // changes the noise reducer EQ preset
  function onPresetChanged(event) {
    var presetNum = parseInt(event.target.value);
    setEQPreset(presetNum);
    presetInputTextEl.innerHTML = presets[presetNum].name;
  }

  function onNameInputChanged(event) {
    currentPlayer.name = event.target.value;
    socket.emit('updatePlayer', currentPlayer);
  }

  function onReadyUpChanged(event) {
    currentPlayer.ready = event.target.checked;
    socket.emit('updatePlayer', currentPlayer);
  }

  getUserMedia({ audio: true, video: false }).then(function(stream) {
    console.log('getUserMedia works, stream created');

    var recorder = new audio.Record(stream);
    recordButtonEl.addEventListener("click", function(){ record(recorder); });

    var speechEvents = hark(stream, { threshold: -50 });

    speechEvents.on('speaking', function() {
      currentPlayer.speaking = true;
      socket.emit('updatePlayer', currentPlayer);
    });

    speechEvents.on('stopped_speaking', function() {
      currentPlayer.speaking = false;
      socket.emit('updatePlayer', currentPlayer);
    });
  }).catch(function(error) {
    return console.warn('No live audio input: ' + error);
  });

  gainInputEl.addEventListener('change', onGainChanged);
  reducerCheckboxEl.addEventListener('change', onReducerToggled);
  presetInputEl.addEventListener('change', onPresetChanged);
  nameInputEl.addEventListener('input', onNameInputChanged);
  readyUpEl.addEventListener('click', onReadyUpChanged);

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
    var playersReadyTotal = 0;

    if (players) {
      for (var i = 0; i < maxPlayers; i++) {
        var player = players[i];
        var playerEl = document.querySelector('.player--' + (i + 1));

        if(!player) {
          playerEl.classList.add('player--waiting');
          playerEl.classList.remove('player--speaking');
          playerEl.querySelector('.ready-wrap').classList.add('ready-wrap--hidden');
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

          if (player.ready) {
            playersReadyTotal++;
            playerEl.querySelector('.ready-wrap').classList.remove('ready-wrap--hidden');
          } else {
            playerEl.querySelector('.ready-wrap').classList.add('ready-wrap--hidden');
          }

          playerEl.classList.remove('player--waiting');
          playerEl.querySelector('.player__name').innerHTML = '' + player.name + (player.name === currentPlayer.name ? '<small>You!</small>' : '');
        }
      }

      if (currentPlayer.host) {
        startGameEl.classList.remove('hide');
      } else {
        startGameEl.classList.add('hide');
      }

      if (playersReadyTotal >= 2 && playersReadyTotal === players.length) {
        startGameEl.classList.remove('button--start_game--disabled');
      } else {
        startGameEl.classList.add('button--start_game--disabled');
      }
    }
  });

  socket.on('info', function (text) {
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(text));
    document.querySelector('.info').appendChild(li);
  });
};

module.exports = game;
