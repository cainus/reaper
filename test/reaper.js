var should = require('should');
var _ = require('underscore');
var Reaper = require('../reaper').Reaper;

describe('Reaper', function(){

  describe('#connectMiddleware', function(){
    it ('detects unacceptable Accept headers', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      var req = { on : function(){}};
      req.headers = {'accept' : 'application/xml'};
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        err.should.equal("Not Acceptable");
        done();
      });
    });
    it ('early exits when method is DELETE', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      var req = { on : function(type, cb){
                          should.not.exist(type);
                       },
                  headers : {},
                  method : 'DELETE'};
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        should.not.exist(err);
        done();
      });
    });
    it ('early exits when method is GET', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      var req = { on : function(type, cb){
                          should.not.exist(type);
                       },
                  headers : {},
                  method : 'GET'};
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        should.not.exist(err);
        done();
      });
    });
    it ('allows acceptable Accept headers', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      var req = { 
        method : "GET",
        on : function(type, cb){
                if (type === 'end'){
                  cb();
                }
              }};
      req.headers = {'accept' : 'application/json'};
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        should.not.exist(err);
        done();
      });
    });
    it ('detects missing content-type', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      var req = { 
        method : "PUT",
        on : function(type, cb){
                if (type === 'end'){
                  cb();
                }
              }};
      req.headers = {
        'accept' : 'application/json'//,
      };
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        err.should.equal('Missing Content-Type');
        done();
      });
    });
    it ('detects unsupported content-type', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      var req = { 
        method : "PUT",
        on : function(type, cb){
                if (type === 'end'){
                  cb();
                }
              }};
      req.headers = {
        'accept' : 'application/json',
        'content-type' : 'application/wthever'
      };
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        err.should.equal('Unregistered content-type.');
        done();
      });
    });
    it ('detects a parse error when there is one', function(done){
      var m = new Reaper();
      m.register('application/json',
                 function(){throw "fake parse error";},
                 function(){return "OUT";});
      var req = { 
        method : "PUT",
        on : function(type, cb){
                if (type === 'end'){
                  cb();
                }
              },
        body : ''
      };
      req.headers = {
        'accept' : 'application/json',
        'content-type' : 'application/json'
      };
      var res = {};
      m.connectMiddleware()(req, res, function(err){
        err.should.match(/^Parse Error: /);
        done();
      });
    });
  });


  describe('#register', function(){
    it ('adds a content type and handler to the registry', function(){
      var m = new Reaper();
      m.register('application/json',
                 function(){return "IN";},
                 function(){return "OUT";});
      _.keys(m._handlers)[0].should.equal('application/json');
      m._handlers['application/json']._inF().should.equal("IN");
      m._handlers['application/json']._outF().should.equal("OUT");
    });
  });

  describe('#isAcceptable', function(){
    beforeEach(function(){
      this.m = new Reaper();
      this.m.register('application/json',
                       function(){return "IN";},
                       function(){return "OUT";});
    });
    it ("returns true for */* scenarios", function(){
      this.m.isAcceptable('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8').should.equal(true);
    });
    it ("returns false for unacceptable scenarios", function(){
      this.m.isAcceptable('text/html,application/xhtml+xml,application/xml').should.equal(false);
    });
    it ("returns true for precise acceptable scenarios", function(){
      this.m.isAcceptable('text/html,application/xhtml+xml,application/json').should.equal(true);
    });
  });

  describe('#isRegistered', function(){
    it ("checks for a content type in the registry and returns false if it's not there", function(){
      var m = new Reaper();
      m.isRegistered('application/json').should.equal(false);
    });
    it ("checks for a content type in the registry and returns true if it's there", function(){
      var m = new Reaper();
      m.register('application/json', function(){}, function(){});
      m.isRegistered('application/json').should.equal(true);
    });
  });

  describe('#setDefault', function(){
    it ('sets the default content type to use when none is explicitly specified', function(){
      var m = new Reaper();
      m.register('application/json', function(){}, function(){});
      m.setDefault('application/json');
      m._default.should.equal('application/json');
    });
  });

  describe('#input', function(){
    it ('takes a content type and body and runs them through the in-handler to get a return value', function(){
      var m = new Reaper();
      function jsonIn(str){
        return JSON.parse(str);
      }
      function jsonOut(obj){
        return JSON.stringify(obj);
      }
      m.register('application/json', jsonIn, jsonOut);
      var obj = m.input("application/json", '{"hello" : "world"}');
      obj.hello.should.equal("world");
    });
  });
  describe('#output', function(){
    it ('takes an accept header and data hash and runs them through the out-handler to get a return type and value', function(){
      var m = new Reaper();
      function jsonIn(str){
        return JSON.parse(str);
      }
      function jsonOut(obj){
        return JSON.stringify(obj);
      }
      m.register('application/json', jsonIn, jsonOut);
      var obj = m.output("application/json, text/javascript, */*; q=0.01", {"hello" : "world"});
      obj.type.should.equal("application/json");
      obj.content.should.equal('{"hello":"world"}');
    });
    it ('takes a null accept header and matches an otherwise non-match', function(){
      function jsonIn(str){
        return JSON.parse(str);
      }
      function jsonOut(obj){
        return JSON.stringify(obj);
      }
      var m = new Reaper();
      m.register('application/json', jsonIn, jsonOut);
      var obj = m.output(null, {"hello" : "world"});
      obj.type.should.equal("application/json");
      obj.content.should.equal('{"hello":"world"}');
    });
    it ('takes a wild card accept header and matches an otherwise non-match', function(){
      function jsonIn(str){
        return JSON.parse(str);
      }
      function jsonOut(obj){
        return JSON.stringify(obj);
      }
      var m = new Reaper();
      m.register('application/json', jsonIn, jsonOut);
      var nojson = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
      var obj = m.output(nojson, {"hello" : "world"});
      obj.type.should.equal("application/json");
      obj.content.should.equal('{"hello":"world"}');
    });
  });



});
