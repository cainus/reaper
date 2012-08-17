var _ = require('underscore');
var preferredMediaTypes = require('./mediaType').preferredMediaTypes;

var Reaper = function(){
  this._handlers = {};
  this._default = null;
};

Reaper.prototype.register = function(type, inF, outF){
  this._handlers[type] = {_inF : inF, _outF : outF};
};

Reaper.prototype.setDefault = function(type){
  if (!this.isRegistered(type)){
    throw "Cannot set the default type to one that isn't registered.";
  }
  this._default = type;
};

Reaper.prototype.isAcceptable = function(header){
  header = header || '*/*';
  var type = headerToType(this, header);
  return !!type;
};

Reaper.prototype.isRegistered = function(type){
  return _.has(this._handlers, type);
};

Reaper.prototype.input = function(type, str){
  var handlers = this._handlers[type];
  if (!handlers){
    throw "Unregistered content-type.";
  }
  return handlers._inF(str);
};

Reaper.prototype.output = function(header, obj){
  header = header || '*/*';
  var type = headerToType(this, header);

  var handlers = this._handlers[type];
  if (!handlers){
    throw "Unregistered content-type. OUT " + header;
  }
  return {type: type, content : handlers._outF(obj)};
  
};

Reaper.prototype.connectMiddleware = function(){
  var reaper = this;

  return function(req, res, next){
    var accept = req.headers.accept || '*/*';
    var body = '';
    if (!reaper.isAcceptable(accept)){
      return next("Not Acceptable");
    }
    if (_.include(['GET', 'DELETE'], req.method)){
      return next();
    }
    req.on('data', function(data){
      body += data;
    });
    req.on('end', function(){
      var contentType = req.headers['content-type'];
      if (!contentType){
        return next("Missing Content-Type");
      }
      try {
        req.body = reaper.input(contentType, body);
        return next();
      } catch(ex) {
        if (ex === "Unregistered content-type."){
          return next(ex);
        }
        return next("Parse Error: " + ex.toString());
      }
    });
  };
};

exports.Reaper = Reaper;

var headerToType = function(reaper, header){
  var supported = _.keys(reaper._handlers);
  var preferred = preferredMediaTypes(header, supported);
  return preferred[0];
};
