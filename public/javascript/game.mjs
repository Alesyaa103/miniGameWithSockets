import {
  createRoom,
  displayUsers
} from './helpers/roomHelper.mjs';
import {
  createElement,
  createRoomElement
} from './helpers/domHelper.mjs';

const username = sessionStorage.getItem('username');
const socket = io('', {
  query: {
    username
  }
});
const roomsElement = document.getElementById('room-list');
const readyBtn = document.getElementById('ready');
const notReadyBtn = document.getElementById('not-ready');
const leaveBtn = document.getElementById('button-back');
const createBtn = document.getElementById('button-create');
const roomsPage = document.getElementById('rooms-page');
const gamePage = document.getElementById('game-page');
const gameSection = document.getElementById('game-section');

createBtn.addEventListener('click', createRoom.bind(null, socket));

readyBtn.addEventListener('click', () => {
  readyBtn.classList.add('display-none');
  notReadyBtn.classList.remove('display-none');
  socket.emit('USER_READY');
});

notReadyBtn.addEventListener('click', () => {
  notReadyBtn.classList.add('display-none');
  readyBtn.classList.remove('display-none');
  socket.emit('USER_NOT_READY');
});

leaveBtn.addEventListener('click', () => {
  roomsPage.classList.remove('display-none');
  gamePage.classList.add('display-none');
  socket.emit('LEAVE_ROOM');
  document.getElementById('game-title').remove()
  document.getElementById('user-container').remove()
})

const finishGame = (startId, isDraw) => {
  clearTimeout(startId);
  document.querySelector('.text-container').remove();
  document.querySelector('.entered-container').remove();
  document.querySelector('.timer').remove();
  if (isDraw) {
    socket.emit("FINISH_GAME");

  } else {
    socket.emit('GET_WINNER')
  }
}

const gameProcess = (textContainer, enteredContainer, startId, e) => {
  let textToEnter = textContainer.textContent.split('');
  let enteredText = enteredContainer.textContent.split('');
  if (e.key === textToEnter[0]) {
    const symbol = textToEnter.shift();
    enteredText.push(symbol);
    enteredContainer.innerHTML = enteredText.join('');
    textContainer.innerText = textToEnter.join('');
    const enteredLength = enteredText.length;
    const textToEnterLength = textToEnter.length;
    const progress = Math.floor(enteredLength / (enteredLength + textToEnterLength) * 1000);
    socket.emit('CORRECT_INPUT', progress);
    if (textToEnterLength === 0) {
      const isDraw = false;
      finishGame(startId, isDraw)
    }
  };
}

if (!username) {
  window.location.replace('/login');
}

socket.on('ROOM_GOT', (rooms) => {
  rooms.forEach(room => createRoomElement(room, roomsElement, socket));
});

socket.on('JOINED_ROOM', (data) => {
  const {
    name,
    users
  } = data;
  const gameAside = document.getElementById('game-aside');
  roomsPage.classList.add('display-none');
  gamePage.classList.remove('display-none');
  const nameElement = createElement({
    tagName: 'h2',
    text: name,
    attributes: {
      id: 'game-title'
    }
  });
  gameAside.prepend(nameElement);
  displayUsers(users)
});

socket.on('ERROR_USER', (message) => {
  alert(`${message}`);
  sessionStorage.removeItem('username');
  window.location.replace('/login');
})

socket.on('ERROR_ROOM', (message) => alert(message));


socket.on('NEW_CONNECT', users => {
  const userContainer = document.getElementById('user-container');
  userContainer.parentNode.removeChild(userContainer);
  displayUsers(users)
});

socket.on('USER_LEFT', () => {
  const userContainer = document.getElementById('user-container');
  userContainer.parentNode.removeChild(userContainer);
})
socket.emit('GET_ROOMS');

socket.on('UPDATE_ROOMS', (room) => {
  const {
    id
  } = room;
  const existedRoom = document.getElementById(id);
  if (existedRoom) {
    existedRoom.parentNode.removeChild(existedRoom);
  }
  createRoomElement(room, roomsElement, socket)
})

socket.on('UPDATE_USER_INDICATOR', id => {
  const parentNode = document.getElementById(id);
  const userIndicator = parentNode.querySelector('.user-indicator');
  userIndicator.classList.add('ready')
})

socket.on('CANCEL_USER_INDICATOR', id => {
  const parentNode = document.getElementById(id);
  const userIndicator = parentNode.querySelector('.user-indicator');
  userIndicator.classList.remove('ready')
  userIndicator.classList.add('not-ready')
})

socket.on('START_GAME', ({
  start,
  finish,
  textId
}) => {
  const container = createElement({
    tagName: 'div',
    attributes: {
      'id': 'container'
    }
  });
  gameSection.append(container);
  const timer = createElement({
    tagName: 'div',
    className: 'timer'
  });
  container.append(timer);
  const enteredContainer = createElement({
    tagName: 'pre',
    className: 'entered-container'
  });
  const textContainer = createElement({
    tagName: 'pre',
    className: 'display-none text-container'
  });
  container.append(enteredContainer);
  container.append(textContainer);
  fetch(`http://localhost:3002/game/texts/${textId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(({
      text
    }) => textContainer.innerText = text)
    .catch(error => window.location.reload());
  let i = start;
  const decrease = () => i--;

  const startGame = () => {
    clearInterval(timerId);
    timer.classList.add('display-none');
    textContainer.classList.remove('display-none');
    document.addEventListener('keyup', gameProcess.bind(null, textContainer, enteredContainer, startId));
    const isDraw = true;
    setTimeout(finishGame.bind(null, startId, isDraw), finish * 1000);
  }

  const timerId = setInterval(() => {
    timer.innerText = `${decrease()}`;
  }, 1000);

  const startId = setTimeout(startGame, start * 1000);
})

socket.on('UPDATE_PROGRESS', ({
  value,
  id
}) => {
  const progressBar = document.querySelector(`#${id} #progress`);
  progressBar.value = value;
});

socket.on('GET_RESULTS', (winner) => {
  const container = document.getElementById('container');
  if (winner) {
    container.innerText = `The winner is ${winner}`;
  } else {
    container.innerText = 'The draw'
  }
})