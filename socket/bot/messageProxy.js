import messageFactory from './messageFactory.js';

function messageProxy() {
  this.api = messageFactory;
  this.get = function({type, users}) {
    const { message } = this.api.get({type, users});
    return message;
  };
};

const proxy = new messageProxy();

export default proxy;
