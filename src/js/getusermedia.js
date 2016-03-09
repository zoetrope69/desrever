var getUserMedia = function(constraints){
  return new Promise(function(resolve, reject) {
    var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {
      // first get ahold of getUserMedia, if present
      var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);

      // some browsers just don't implement it - return a rejected promise with an error to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(successCallback, errorCallback) {
        getUserMedia.call(navigator, constraints, successCallback, errorCallback);
      });
    }

    // older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }

    // some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(resolve)
      .catch(reject);
  });
}

module.exports = getUserMedia;
