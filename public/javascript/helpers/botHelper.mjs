import { createElement } from './domHelper.mjs';

export const createBotMessage = (message) => {
  const container = document.getElementById('bot-section');
  createElement({tagName: 'div', className: 'bot-message', text: message, parentNode: container})
}