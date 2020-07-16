import { createRoom, displayUsers, createRating } from './helpers/roomHelper.mjs';
import { createElement, createRoomElement, switchVisibility, createModal } from './helpers/domHelper.mjs';
import { createBotMessage } from './helpers/botHelper.mjs';

const username = sessionStorage.getItem('username');
const socket = io('', { query: { username } });
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
  switchVisibility({elementToShow: notReadyBtn, elementToHide: readyBtn});
  socket.emit('USER_READY');
});

notReadyBtn.addEventListener('click', () => {
  switchVisibility({elementToShow: readyBtn, elementToHide: notReadyBtn});
  socket.emit('USER_NOT_READY');
});

leaveBtn.addEventListener('click', () => {
  clearGameField();
  switchVisibility({elementToShow: roomsPage, elementToHide: gamePage});
  socket.emit('LEAVE_ROOM');
  document.getElementById('game-title').remove()
  document.getElementById('user-container').remove()
});

const clearGameField = () => {
  const container = document.querySelector('#container');
  container && container.remove();
  switchVisibility({elementToShow: readyBtn, elementToHide: notReadyBtn});
}

const finishGame = (startId, notigicationTimerId, jokeTimerId) => {
  clearTimeout(startId);
  clearInterval(notigicationTimerId);
  clearInterval(jokeTimerId);
  socket.emit('FINISH_GAME');
};

const gameProcess = (textContainer, enteredContainer, currentTime, socket, e) => {
  const textToEnter = textContainer.textContent.split('');
  const enteredText = enteredContainer.textContent.split('');
  if (e.key === textToEnter[0]) {
    const symbol = textToEnter.shift();
    enteredText.push(symbol);
    enteredContainer.innerHTML = enteredText.join('');
    textContainer.innerText = textToEnter.join('');
    const enteredLength = enteredText.length;
    const textToEnterLength = textToEnter.length;
    const progress = Math.floor(enteredLength / (enteredLength + textToEnterLength) * 100);
    socket.emit('CORRECT_INPUT', progress);
    if (textToEnterLength === 0) {
      const finishTime = Date.now() - currentTime;
      socket.emit('WHOLE_TEXT_ENTERED', finishTime);
    }
    textToEnterLength === 30 && socket.emit('GET_WARNING_MESSAGE');
    textToEnterLength === 0 && socket.emit('GET_FINISH_MESSAGE');
  };
}

if (!username) {
  window.location.replace('/login');
}

socket.on('ROOM_GOT', (rooms) => {
  rooms.forEach(room => createRoomElement(room, roomsElement, socket));
});

socket.on('JOINED_ROOM', name => {
  const gameAside = document.getElementById('game-aside');
  switchVisibility({elementToShow: gamePage, elementToHide: roomsPage});
  const nameElement = createElement({
    tagName: 'h2',
    text: name,
    attributes: {
      id: 'game-title'
    }
  });
  gameAside.prepend(nameElement);
});

socket.on('ERROR_USER', (message) => {
  alert(`${message}`);
  sessionStorage.removeItem('username');
  window.location.replace('/login');
})

socket.on('ERROR_ROOM', (message) => alert(message));


socket.on('NEW_CONNECT', ({users, activePlayer}) => {
  const userContainer = document.getElementById('user-container');
  userContainer && userContainer.parentNode.removeChild(userContainer);
  displayUsers(users, activePlayer);
});

socket.on('USER_LEFT', () => {
  const userContainer = document.getElementById('user-container');
  userContainer.parentNode.removeChild(userContainer);
  document.querySelectorAll('.bot-message').forEach(item =>item.remove());
});

socket.emit('GET_ROOMS');

socket.on('UPDATE_ROOMS', (room) => {
  const { id } = room;
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

socket.on('START_GAME', ({ start, finish, textId }) => {
  const container = createElement({
    tagName: 'div',
    attributes: {
      'id': 'container'
    },
    parentNode: gameSection
  });
  const timer = createElement({
    tagName: 'div',
    className: 'timer',
    parentNode: container
  });
  const textContainer = createElement({
    tagName: 'div',
    className: 'text-container',
    parentNode: container
  })
  const enteredContainer = createElement({
    tagName: 'pre',
    className: 'entered-container',
    parentNode: textContainer
  });
  const notEnteredContainer = createElement({
    tagName: 'pre',
    className: 'display-none not-entered-container',
    parentNode: textContainer
  });

  fetch(`http://localhost:3002/game/texts/${textId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(({ text }) => notEnteredContainer.innerText = text)
    .catch(error => window.location.reload());

  let i = start;
  const decrease = () => i--;

  const startGame = () => {
    clearInterval(timerId);
    socket.emit('GET_START_MESSAGE')
    const currentTime = Date.now();
    switchVisibility({elementToShow: notEnteredContainer, elementToHide: timer});
    document.addEventListener('keyup', gameProcess.bind(null, notEnteredContainer, enteredContainer, currentTime, socket));
    setTimeout(finishGame.bind(null, startId, notigicationTimerId, jokeTimerId), finish * 1000);
  }

  const timerId = setInterval(() => {
    timer.innerText = `${decrease()}`;
  }, 1000);

  const notigicationTimerId = setInterval(() => {
    socket.emit('GET_NOTIFICATION_MESSAGE');
  }, 30000);

  const jokeTimerId = setInterval(() => {
    socket.emit('GET_JOKE_MESSAGE');
  }, 7000);

  const startId = setTimeout(startGame, start * 1000);
})

socket.on('UPDATE_PROGRESS', ({ value, id }) => {
  const progressBar = document.querySelector(`#${id} #progress`);
  progressBar.value = value;
});

socket.on('GET_RESULTS', results => {
  const rating = createRating(results);
  // createModal(rating)
});

socket.on('BOT_MESSAGE', message => {
  createBotMessage(message);
})