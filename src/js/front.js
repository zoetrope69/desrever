var front = function () {
  var joinRoomInput = document.querySelector('.input--join-room');
  var joinRoomButton = document.querySelector('.button--join-room');

  disableButton();

  joinRoomInput.addEventListener('input', function(event) {
    var roomInput = event.target.value;

    var hasUrl = roomInput.indexOf(window.location.origin) > -1;
    var hasRoom = roomInput.length > window.location.origin.length + 1;

    // if a valid url and has a room specified then let the user go to that link
    if (hasUrl && hasRoom) {
      enableButton();
    } else {
      disableButton();
    }
  });

  function enableButton() {
    joinRoomButton.setAttribute('disabled', false);
    joinRoomButton.setAttribute('href', roomInput);
    joinRoomButton.classList.remove('disabled');
  }

  function disableButton() {
    joinRoomButton.setAttribute('href', '#');
    joinRoomButton.setAttribute('disabled', true);
    joinRoomButton.classList.add('disabled');
  }
};

module.exports = front;
