"use strict";
module.exports = class Player {
  constructor(username) {
    this.id = 0;
    this.username = username;
  }

  setID(id){
    this.id = id;
  }
}
