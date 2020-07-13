import { createElement } from './domHelper.mjs';

export const createRoom = (socket, e) => {
  const roomName = prompt('Enter the name of your room', 'Default name')
  socket.emit('CREATE_ROOM', roomName);
}

export const joinRoom = (socket, id, e) => {
  socket.emit("JOIN_ROOM", id);
}

export const displayUsers = (users) => {
  const gameAside = document.getElementById('game-aside');
  const userContainer = createElement({tagName: 'div', attributes: {'id': 'user-container'}});
  gameAside.append(userContainer);
  users.forEach((user, index) => {
    const userListItem = createElement({tagName: 'div', className: 'user-item', attributes: {id: user.id}});
    const userIndicator = createElement({tagName:'span', className: 'user-indicator'});
    if(user.ready) {
      userIndicator.classList.add('ready')
    } else {
      userIndicator.classList.add('not-ready')
    }
    const userName = createElement({tagName: 'span', className: 'user-name', text: user.username});
    const userIdElement = createElement({tagName: 'span', className: 'user-id', text: `#${index + 1}`});
    const progressBar = createElement({tagName:'progress', attributes: {
      'id': 'progress',
      'max': '100',
      value: '0'
    }})
    userContainer.append(userListItem);
    userListItem.append(userIndicator);
    userListItem.append(userName);
    userListItem.append(userIdElement);
    userListItem.append(progressBar);
  })
}