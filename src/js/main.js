var front = require('./front');
var game = require('./game');
var utils = require('./utils');

var ready = function() {
  // there's different implementations of APIs in different browsers so we're finding which one
  window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  window.URL = window.URL || window.webkitURL || window.mozURL;

  console.log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));

  // check if there's a room specified in the url
  var room = window.location.pathname.split('/')[1];

  if (room) {
    game();
  } else {
    front();
  }
};

// when the DOM has loaded
document.addEventListener('DOMContentLoaded', ready, false);
