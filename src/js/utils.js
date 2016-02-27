var displayError = function(message) {
  var errorMessage = document.querySelector('.error-message');
  errorMessage.innerHTML = message;
  errorMessage.style.display = 'block';
}

var makeId = function() {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for(var i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return 'Player-'+text;
}

module.exports = {
  displayError: displayError,
  makeId: makeId
};
