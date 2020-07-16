import * as config from './config';
const {
  MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_TIMER_BEFORE_START_GAME,
  SECONDS_FOR_GAME
} = config;
import { transport } from '../data';
import bot from './bot/botFacade';

const rooms = {};
const users = new Set();

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const joinRoom = (socket, room) => {
  socket.ready = false;
  socket.progress = null;
  socket.timing = null;
  room.sockets.push(socket);
  socket.join(room.id, () => { socket.roomId = room.id; });
  socket.emit('JOINED_ROOM', room.name);
  socket.emit('BOT_MESSAGE', bot.initMessage())
};

const redirectUser = socket => {
  socket.emit('ERROR_USER', 'User with such username already exist!');
};

const checkStartGame = (room, socket) => {
  const isAllUsersReady = room.sockets.every((user) => user.ready === true);
  if (room.sockets.length === MAXIMUM_USERS_FOR_ONE_ROOM || isAllUsersReady) {
    room.available = false;
    socket.broadcast.emit('UPDATE_ROOMS', {
      id: room.id,
      available: false
    });
    const num = Math.floor(Math.random() * 7);
    room.sockets.forEach((player, index) => player.transport = transport.get(index));
    for (const client of room.sockets) {
      client.emit('START_GAME', {
        start: SECONDS_TIMER_BEFORE_START_GAME,
        finish: SECONDS_FOR_GAME,
        textId: num,
      });
    }
  }
};

const leaveRooms = socket => {
  socket.ready = false;
  const roomsToDelete = [];
  for (const id in rooms) {
    const room = rooms[id];
    if (room.sockets.includes(socket)) {
      socket.leave(id);
      room.sockets = room.sockets.filter((item) => item !== socket);
    }
    const countUsers = room.sockets.length;
    if (countUsers === 0) {
      roomsToDelete.push(room);
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: room.id,
        available: false
      });
    } else {
      checkStartGame(room, socket);
      updateCurrentUsers(room);
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: room.id,
        count: countUsers,
        name: room.name,
        available: room.available
      });
    }
  };

  socket.roomId = null;
  socket.progress = null;
  socket.timing = null;
  for (const room of roomsToDelete) {
    delete rooms[room.id];
  }

  return roomsToDelete.length;
};

const updateCurrentUsers = room => {
  const currentUsers = room.sockets.map(({ ready, id, username }) => ({ ready, id, username }));
  for (const client of room.sockets) {
    client.emit('NEW_CONNECT', {
      users: currentUsers,
      activePlayer: client.username
    });
  };
};

export default io => {
  io.on('connection', socket => {
    socket.id = generateId();
    const username = socket.handshake.query.username;
    const isntUnique = users.has(username);
    if (isntUnique) {
      redirectUser(socket)
    } else {
      users.add(username);
      socket.username = username;
    };

    socket.on('USER_READY', () => {
      const room = rooms[socket.roomId];
      room.sockets.forEach(user => user.id === socket.id && (user.ready = true));
      for (const client of room.sockets) {
        client.emit('UPDATE_USER_INDICATOR', socket.id);
      }
      checkStartGame(room, socket)
    });

    socket.on('USER_NOT_READY', () => {
      const room = rooms[socket.roomId];
      room.sockets.forEach(user => user.id === socket.id && (user['ready'] = false));
      for (const client of room.sockets) {
        client.emit('CANCEL_USER_INDICATOR', socket.id);
      }
    });

    socket.on('CORRECT_INPUT', value => {
      const room = rooms[socket.roomId];
      socket.progress = value;
      for (const client of room.sockets) {
        client.emit('UPDATE_PROGRESS', {
          value,
          id: socket.id
        })
      }
    })

    socket.on('WHOLE_TEXT_ENTERED', value => { socket.timing = value; });

    socket.on('GET_ROOMS', () => {
      const roomNames = [];
      for (const id in rooms) {
        const { name, available } = rooms[id];
        const counterUsers = rooms[id].sockets.length;
        const room = { name, id, count: counterUsers, available };
        roomNames.push(room);
      }
      socket.emit('ROOM_GOT', roomNames)
    });

    socket.on('CREATE_ROOM', roomName => {
      let isUnigue = true;
      for (const key in rooms) {
        const {
          name
        } = rooms[key];
        roomName === name && (isUnigue = false);
      }
      if (isUnigue) {
        const room = {
          id: generateId(),
          name: roomName,
          sockets: [],
          available: true
        };
        rooms[room.id] = room;
        joinRoom(socket, room);
        updateCurrentUsers(room);
        socket.broadcast.emit('UPDATE_ROOMS', {
          name: room.name,
          id: room.id,
          count: room.sockets.length,
          available: room.available
        });
      } else socket.emit('ERROR_ROOM', 'Such room already exist')
    });

    socket.on('JOIN_ROOM', roomId => {
      const room = rooms[roomId];
      joinRoom(socket, room);
      updateCurrentUsers(room);
      room.sockets.length === MAXIMUM_USERS_FOR_ONE_ROOM && (room.available = false);
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: roomId,
        count: room.sockets.length,
        name: room.name,
        available: room.available,
      })
    });

    socket.on('GET_NOTIFICATION_MESSAGE', () => {
      const room = rooms[socket.roomId];
      socket.emit('BOT_MESSAGE', bot.notificationMessage(room.sockets));
    });

    socket.on('GET_START_MESSAGE', () => {
      const room = rooms[socket.roomId];
      socket.emit('BOT_MESSAGE', bot.introduceMessage(room.sockets));
    });

    socket.on('GET_WARNING_MESSAGE', () => {
      const room = rooms[socket.roomId];
      for (const client of room.sockets) {
        client.emit('BOT_MESSAGE', bot.warningMessage(socket));
      }
    });

    socket.on('GET_FINISH_MESSAGE', () => {
      const room = rooms[socket.roomId];
      for (const client of room.sockets) {
        client.emit('BOT_MESSAGE', bot.finishMessage(socket));
      }
    });

    socket.on('GET_JOKE_MESSAGE', () => {
      socket.emit('BOT_MESSAGE', bot.randomMessage());
    })

    socket.on('LEAVE_ROOM', () => {
      leaveRooms(socket);
    });

    socket.on('FINISH_GAME', () => {
      const room = rooms[socket.roomId];
      const finishedUsres = room.sockets.filter(client => client.timing)
        .sort((a, b) => a.timing > b.timing ? 1 : -1)
        .map(({ username, timing, progress, transport }) => ({ username, timing, progress, transport }));
      const unfinishedUsers = room.sockets.filter(client => !client.timing)
        .sort((a, b) => a.progress > b.progress ? -1 : 1)
        .map(({ username, timing, progress, transport }) => ({ username, transport, timing, progress }));
      const results = [...finishedUsres, ...unfinishedUsers];
      const usersToBot = results.slice(0, 3);
      socket.emit('BOT_MESSAGE', bot.resultMessage(usersToBot));
      socket.emit('GET_RESULTS', results);
    });

    socket.on('disconnect', () => {
      users.delete(socket.username)
      leaveRooms(socket);
    });
  });
};