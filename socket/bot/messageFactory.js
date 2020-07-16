function InitMessage() {
  this.message = 'Hey there. You know who this is. Last seconds before game are expiring. So be patient, be concentrated. Good Luck!';
};

function IntroduceMessage(users) {
  this.message = `Here we go. Let\'s introduce our players. ${getParsedInfo(users, introducePhrase)}Good luck everyone!`
};

function NotificationMessage(users) {
  this.message = `For now ${getParsedInfo(users, notificationPhrase)}. Keep up guys!`
}

function WarningMessage(users) {
  this.message = `${getParsedInfo(users, warningPhrase)} Be careful guys! Hurry up!`
}

function FinishMessage(users) {
  this.message = `${getParsedInfo(users, finishPhrase)}. Congrats!`
}

function ResultMessage(users) {
  this.message = `${getParsedInfo(users, resultPhrase)}. Congratulations guys!!!`
}

function JokeMessage() {
  this.message = 'Random joke';
}

function MessageFactory() {
  this.get = function({type, users}) {
    let messageConstructor = null;
    switch (type) {
      case 'init':
        messageConstructor = InitMessage;
        break;
      case 'introduce':
        messageConstructor = IntroduceMessage;
        break;
      case 'notification':
        messageConstructor = NotificationMessage;
        break;
      case 'warning':
        messageConstructor = WarningMessage;
        break;
      case 'finish':
        messageConstructor = FinishMessage;
        break;
      case 'result':
        messageConstructor = ResultMessage;
        break;
      default:
        messageConstructor = JokeMessage;
    }
    return new messageConstructor(users)
  }
}

const getParsedInfo = (users, func) => {
  let str = '';
  users.forEach((user, index) => str += func({...user, index}))
  return str;
};

const introducePhrase = ({username, transport}) => `Player ${username} drives on ${transport}. `;
const notificationPhrase = ({username, transport, index}) => `Player ${username} on ${transport} goes on ${index+1} position`;
const warningPhrase = ({username}) => `${username} has only 30 symbols to enter!`;
const finishPhrase = ({username, transport}) => `${username} on ${transport} just got to the finish line!`;
const resultPhrase = ({username, transport, index, timing}) => `On ${index+1} place - ${username} on ${transport} with time: ${timing ? timing : 60} sec`;


const messageFactory = new MessageFactory();

export default messageFactory;
