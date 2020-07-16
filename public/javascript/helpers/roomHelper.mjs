import { createElement } from './domHelper.mjs';

export const createRoom = (socket, e) => {
  const roomName = prompt('Enter the name of your room', 'Default name');
  socket.emit('CREATE_ROOM', roomName);
}

export const joinRoom = (socket, id, e) => {
  socket.emit("JOIN_ROOM", id);
}

export const displayUsers = (users, activePlayer) => {
  const gameAside = document.getElementById('game-aside');

  const userContainer = createElement({
    tagName: 'div',
    attributes: {
      'id': 'user-container'
    },
    parentNode: gameAside
  });

  users.forEach((user, index) => {
    const {
      id,
      username,
      ready
    } = user;

    const userListItem = createElement({
      tagName: 'div',
      className: 'user-item',
      attributes: {
        id: id
      },
      parentNode: userContainer
    });

    const userIndicator = createElement({
      tagName: 'span',
      className: 'user-indicator',
      parentNode: userListItem
    });

    ready ? userIndicator.classList.add('ready') : userIndicator.classList.add('not-ready');

    createElement({
      tagName: 'span',
      className: 'user-name',
      text: username,
      parentNode: userListItem
    });

    createElement({
      tagName: 'span',
      className: 'user-id',
      text: `#${index + 1}`,
      parentNode: userListItem
    });

    if (username === activePlayer) {
      createElement({
        tagName: 'span',
        className: 'user-active',
        text: '(you)',
        parentNode: userListItem
      });
    }

    createElement({
      tagName: 'progress',
      attributes: {
        'id': 'progress',
        'max': '100',
        value: '0'
      },
      parentNode: userListItem
    });
  })
}

export const createRating = (rating) => {
  const ratingElement = createElement({tagName: 'ul', className: 'rating'});
  rating.map(({username, timing, progress}) => {
    const ratingItem = createElement({tagName: 'li', className: 'rating-item', parentNode: ratingElement});
    createElement({tagName: 'span', text: username, parentNode: ratingItem});
    progress && createElement({tagName: 'span', text: `${progress}%`, parentNode: ratingItem});
    timing && createElement({tagName: 'span', text: `${timing/1000} sec`, parentNode: ratingItem});
  })
  return ratingElement;
}
