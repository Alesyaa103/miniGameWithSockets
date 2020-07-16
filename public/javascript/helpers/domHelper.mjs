import { joinRoom } from './roomHelper.mjs';

export const createElement = ({tagName, className, text, attributes = {}, parentNode}) => {
  const element = document.createElement(tagName);

  if (className) {
    const classNames = className.split(' ').filter(Boolean);
    element.classList.add(...classNames);
  }
  if (text) {
    element.innerText = text;
  }

  Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]));
  if (parentNode) {
  parentNode.append(element);
  }
  return element;
}

export const createRoomElement = (room, root, socket) => {
  const {name, count, id, available} = room;
    if (available) {
      const roomElement = createElement({
        tagName: 'div',
        className: 'room-item',
        attributes: {'id': id},
        parentNode: root
      })
      const countUsers = count === 1 ? '1 user' : `${count} users`;
      createElement({
        tagName: 'span',
        className:'room-item-connected',
        text: `${countUsers} connected`,
        parentNode: roomElement
      })
      createElement({
        tagName: 'h3',
        className:'room-item-name',
        text: name,
        parentNode: roomElement
      });
      const roomButoon = createElement({
        tagName: 'button',
        className:'room-item-button',
        text: 'Join',
        parentNode: roomElement
      })
      roomButoon.addEventListener('click', joinRoom.bind(null, socket, id))
    }
  }

export const switchVisibility = ({elementToShow, elementToHide}) => {
  elementToHide.classList.add('display-none');
  elementToShow.classList.remove('display-none');
}

export const createModal = (bodyElement) => {
  const layer = createElement({ tagName: 'div', className: 'modal-layer', parentNode: root });
  const modalContainer = createElement({ tagName: 'div', className: 'modal-root', parentNode: layer });
  const headerElement = createElement({ tagName: 'div', className: 'modal-header', parentNode: modalContainer });
  createElement({ tagName: 'span', text: 'Rusults of the game', parentNode: headerElement });
  const closeButton = createElement({ tagName: 'div', className: 'close-btn', text: '×', parentNode: headerElement });
  
  const close = () => {
    const modal = document.querySelector('.modal-layer');
    modal?.remove();    
  };

  closeButton.addEventListener('click', close);
  modalContainer.append(bodyElement);
}