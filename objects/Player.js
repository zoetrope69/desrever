"use strict";
module.exports = class Player {
  constructor(name) {
    this.id = 0;
    this.name = name;
    this.speaking = false;
  }

  setID(id){
    this.id = id;
  }
}
