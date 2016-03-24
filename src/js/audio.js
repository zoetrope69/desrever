// a lot of audio manipulation code stole from https://github.com/ericschmidt/noise-reduction/
var Recorder = require('recorderjs');
var context;

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext();
  console.log('Audio context created');
} catch(e) {
  console.warn('Audio API not supported');
}

var Record = function(stream) {
  var _this = this;

  var input = context.createMediaStreamSource(stream);
  console.log('Media stream created.');

  volume = context.createGain();
  volume.gain.value = 0;
  input.connect(volume);
  volume.connect(context.destination);
  console.log('Input connected to audio context destination.');

  _this.recorder = new Recorder(input);
  console.log('Recorder initialised.');

  _this.startRecording = function(length) {
    console.log('Recording...');

    _this.recorder.record();
  }

  _this.stopRecording = function(callback) {
    console.log('Stopped recording.');

    _this.recorder.stop();
    _this.recorder.exportWAV(callback);

    _this.recorder.clear();
  }
};

// reverses audio buffer
var reverseBuffer = function(buffer) {
  Array.prototype.reverse.call( buffer.getChannelData(0) );
  Array.prototype.reverse.call( buffer.getChannelData(1) );
  return buffer;
}

// creates a buffer from a file, callback is a function of the newly created buffer
var bufferFromFile = function(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    callback(e.target.result);
  };
  reader.readAsArrayBuffer(file);
};

// an 8-band parametric EQ type for convenient application of filters
var ParametricEQ = function() {
  var _this = this;

  _this.input = context.createGain(); // create a pre-gain as the input
  _this.bands = []; // create the bands; all are initially peaking filters
  for (var i = 0; i < 8; i++) {
    var filter = context.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = 64 * Math.pow(2, i);
    filter.Q.value = 1;

    _this.bands.push(filter);
    // connect consecutive bands
    if (i > 0) {
      _this.bands[i-1].connect(_this.bands[i]);
    }
  }

  // connect the input to band 0, and set band 7 as output
  _this.input.connect(_this.bands[0]);
  _this.output = _this.bands[7];

  // sets all band frequencies at once; freqs is a list
  _this.setBandFrequencies = function(freqs) {
    var min = Math.min(_this.bands.length, freqs.length);
    for (var i = 0; i < min; i++) {
      _this.bands[i].frequency.value = freqs[i];
    }
  };

  // sets all band types at once; types is a list
  _this.setBandTypes = function(types) {
    var min = Math.min(_this.bands.length, types.length);
    for(var i = 0; i < min; i++) {
      _this.bands[i].type = types[i];
    }
  };

  // Sets all Q values at once; Qs is a list
  _this.setQValues = function(Qs) {
    var min = Math.min(_this.bands.length, Qs.length);
    for(var i = 0; i < min; i++) {
      _this.bands[i].Q.value = Qs[i];
    }
  };

  // sets all gain values at once; gains is a list
  _this.setBandGains = function(gains) {
    var min = Math.min(_this.bands.length, gains.length);
    for (var i = 0; i < min; i++) {
      _this.bands[i].gain.value = gains[i];
    }
  };
};

// a meter to measure the overall loudness of the audio
var Meter = function() {
  var _this = this;
  // create an analyser as the input
  _this.node = context.createAnalyser();
  _this.node.fftSize = 2048;

  // measurement variables to store the average level & deviation
  var _averageLevel = 0;
  var _averageDeviation = 0;
  var _counter = 0;

  // measures and returns the current loudness, the average loudness, the current deviation, and the average deviation
  _this.measure = function() {
    // read the frequency domain data into an array
    var freqData = new Uint8Array(_this.node.frequencyBinCount);
    _this.node.getByteFrequencyData(freqData);

    // calculate the average level of the signal over all frequencies
    var total = 0;
    for (var i = 0; i < freqData.length; i++) {
        total += parseFloat(freqData[i]);
    }

    var level = total / freqData.length;

    // find the time-average of the level and deviation
    _averageLevel = (_averageLevel * _counter + level) / (_counter + 1);
    var deviation = Math.abs(level - _averageLevel);
    _averageDeviation = (_averageDeviation * _counter + deviation) / (_counter + 1);
    _counter++;

    return {
      level: level,
      averageLevel: _averageLevel,
      deviation: deviation,
      averageDeviation: _averageDeviation
    };
  };

  // resets the averages
  _this.reset = function() {
    _averageLevel = 0;
    _averageDeviation = 0;
    _counter = 0;
  };
};

// a noise gate to manage levels
// eliminates sound below the threshold and amplifies sound above it
var NoiseGate = function(threshold, target) {
  var _this = this;

  // set the threshold and target levels
  _this.threshold = threshold;
  _this.target = target;

  var _meter = new Meter(); // create a level meter
  _this.input = _meter.node; // set the input of the gate to be the meter node
  _this.output = context.createGain(); // create a gain as the output
  _meter.node.connect(_this.output); // connect the meter node to the output

  // controls the gain
  var _controlGain = function() {
    var level = _meter.measure().level;
    if ((level < _this.threshold) || (_this.target / level === Infinity)) {
      _this.output.gain.value = 0.2;
    } else {
      _this.output.gain.value = _this.target / level;
    }
  };

  var _interval = setInterval(_controlGain, 10); // set up the interval at which to control the gain
  var _bypassed = false; // an internal boolean to store whether the module is bypassed or not
  // determines whether the module is active or not - argument is a boolean
  _this.bypass = function (doBypass) {
    if (doBypass && !_bypassed) {
      clearInterval(_interval);
      _bypassed = true;
    } else if (!doBypass && _bypassed) {
      _interval = setInterval(_controlGain, 10);
      _meter.reset();
      _bypassed = false;
    }
  };
};

// a noise reduction module (combines a parametric EQ and a noise gate)
// default threshold is 1, default target is 10
var NoiseReducer = function(threshold, target) {
  var _this = this;

  // set the threshold and target levels
  threshold = threshold || 1;
  target = target || 10;

  _this.gate = new NoiseGate(threshold, target); // create a noise gate to process the sound first

  // create and configure the parametric EQ
  _this.eq = new ParametricEQ();
  _this.eq.setBandFrequencies([164, 200, 191, 677, 1014, 2858, 6240, 10000]);
  _this.eq.setBandTypes(['highpass', 'peaking', 'notch', 'notch', 'notch', 'notch', 'lowpass', 'peaking']);

  var _gain = context.createGain(); // create a post-gain node

  // connect the components: EQ -> noise gate -> gain
  _this.eq.output.connect(_this.gate.input);
  _this.gate.output.connect(_gain);

  _this.input = _this.eq.input; // set the input of this module to be the EQ input
  _this.output = _gain; // set the output of this module to be the gain

  var _bypassed = false; // an internal boolean to store whether the module is bypassed or not
  // determines whether the module is active or not - argument is a boolean
  _this.bypass = function(isBypassed) {
    if (isBypassed && !_bypassed) {
      _this.input.disconnect(0);
      _this.input.connect(_this.output);
      _bypassed = true;
    } else if(!isBypassed && _bypassed) {
      _this.input.disconnect(0);
      _this.input.connect(_this.eq.bands[0]);
      _bypassed = false;
    }
  };
};

module.exports = {
  context: context,
  Record: Record,
  bufferFromFile: bufferFromFile,
  reverseBuffer: reverseBuffer,
  bufferFromFile: bufferFromFile,
  ParametricEQ: ParametricEQ,
  Meter: Meter,
  NoiseReducer: NoiseReducer
};
