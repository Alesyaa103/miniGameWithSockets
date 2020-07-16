import proxy from './messageProxy';

function botFacade() {
  this.initMessage = function() {
    return proxy.get({type: 'init'})
  };
  this.introduceMessage = function(users) {
    return proxy.get({type: 'introduce', users})
  };
  this.notificationMessage = function(users) {
    return proxy.get({type: 'notification', users})
  };
  this.warningMessage = function(user) {
    return proxy.get({type: 'warning', users: [user]})
  };
  this.finishMessage = function(user) {
    return proxy.get({type: 'finish', users: [user]})
  };
  this.resultMessage = function(users) {
    return proxy.get({type: 'result', users})
  };
  this.randomMessage = function() {
    return proxy.get({type: 'random'});
  }
}
const bot = new botFacade();

export default bot