"use strict";
module.exports = class Player {
  constructor(player) {
    this.id = player.id || 0;
    this.name = player.name || '';
    this.speaking = player.speaking || false;
    this.ready = player.ready || false;
    this.host = player.host || false;
  }

  setID(id){
    this.id = id;
  }

  setHost(bool){
    this.host = bool;
  }
}
