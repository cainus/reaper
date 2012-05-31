var _ = require('underscore');
var Negotiator = require('negotiator');


var Reaper = function(){
  this._handlers = {}
  this._default = null;
}

Reaper.prototype.register = function(type, inF, outF){
  this._handlers[type] = {_inF : inF, _outF : outF};
}

Reaper.prototype.setDefault = function(type){
  if (!this.isRegistered(type)){
    throw "Cannot set the default type to one that isn't registered.";
  }
  this._default = type;
}

Reaper.prototype.isRegistered = function(type){
  return _.has(this._handlers, type);
}

Reaper.prototype.in = function(type, str){
  var handlers = this._handlers[type];
  if (!handlers){
    throw "Unregistered content-type.";
  }
  return handlers._inF(str);
}

Reaper.prototype.out = function(header, obj){

  var type = headerToType(this, header)

  var handlers = this._handlers[type];
  if (!handlers){
    throw "Unregistered content-type.";
  }
  return {type: type, content : handlers._outF(obj)};
  
}

exports.Reaper = Reaper;

var headerToType = function(reaper, header){
  var fakeRequest = { headers : { accept : header }};
  var n = new Negotiator(fakeRequest);
  return n.preferredMediaType(_.keys(reaper._handlers));
}
