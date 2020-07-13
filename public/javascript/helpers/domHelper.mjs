import { joinRoom } from './roomHelper.mjs';

export const createElement = ({tagName, className, text, attributes = {}}) => {
  const element = document.createElement(tagName);

  if (className) {
    const classNames = className.split(' ').filter(Boolean);
    element.classList.add(...classNames);
  }
  if (text) {
    element.innerText = text;
  }

  Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]));

  return element;
}

export const createRoomElement = (room, root, socket) => {
  
  const {name, count, id, available} = room;
    if (available) {
      const roomElement = createElement({
        tagName: 'div',
        className: 'room-item',
        attributes: {'id': id}
      })
      let countUsers = count === 1 ? '1 user' : `${count} users`;
      const usersConnected = createElement({
        tagName: 'span',
        className:'room-item-connected',
        text: `${countUsers} connected`
      })
      const roomTitle = createElement({
        tagName: 'h3',
        className:'room-item-name',
        text: name
      });
      const roomButoon = createElement({
        tagName: 'button',
        className:'room-item-button',
        text: 'Join'
      })
      roomElement.append(usersConnected);
      roomElement.append(roomTitle);
      roomElement.append(roomButoon);
      root.append(roomElement);
      roomButoon.addEventListener('click', joinRoom.bind(null, socket, id))
    }
  }
