
var assert = require('assert');
var should = require('should');
var plugin = require('..');

describe('leader-github-search', function () {
  //var github = plugin({api: {clientId: '002cdcdaa15815d40281', secret: '8cfe05f27e920fa1103fbc78f227ae31ade8f97a'}});
  var github = plugin();

  it('should wait if theres no full name', function () {
    var context = {}, person = {name: 'Ted '};
    assert(!github.wait(person, context));
  });

  it('should wait if theres already a username', function () {
    var context = {}, person = {name: 'Ted Tomlinson', github: {username: 'tedjt'}};
    assert(!github.wait(person, context));
  });

  it('should not wait if there is a company name', function () {
    var person = { name: 'Ted Tomlinson'};
    var context = {};
    assert(github.wait(person, context));
  });

  it('should merge profile if the name is similar', function () {
    assert(plugin.test.validateName('Johnathan Mark Smith', 'John Smith'));
  });

  it('should not merge profile if the name is not similar', function () {
    assert(!plugin.test.validateName('John Greenwood', 'John Smith'));
  });

  it('should be able to resolve a valid profile for Ted Tomlinson', function (done) {
    var person = { name: 'Ted Tomlinson'};
    var context = {};
    github.fn(person, context, function (err) {
      if (err) return done(err);
      assert(person);
      person.github.url.should.equal('https://github.com/tedjt');
      person.github.username.should.equal('tedjt');
      (typeof person.github.email).should.equal('undefined');
      done();
    });
  });

  it('should be able to resolve a valid profile for Max Kolysh', function (done) {
    var person = { name: 'Max Kolysh'};
    var context = {};
    github.fn(person, context, function (err) {
      if (err) return done(err);
      console.log(person);
      assert(person);
      person.github.url.should.equal('https://github.com/maxko87');
      person.github.username.should.equal('maxko87');
      person.github.email.should.equal('maxko87@gmail.com');
      done();
    });
  });

  it.only('should be able to resolve a valid profile for Max Kolysh', function (done) {
    var person = { name: 'Gordon Wintrob'};
    var context = {};
    github.fn(person, context, function (err) {
      if (err) return done(err);
      console.log(person);
      assert(person);
      person.github.url.should.equal('https://github.com/gwintrob');
      person.github.username.should.equal('gwintrob');
      done();
    });
  });

});
