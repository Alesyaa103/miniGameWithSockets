import * as config from './config';
const {
  MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_TIMER_BEFORE_START_GAME,
  SECONDS_FOR_GAME
} = config;
const rooms = {};
const users = [];

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const joinRoom = (socket, room) => {
  socket.ready = false;
  room.sockets.push(socket);
  socket.join(room.id, () => {
    socket.roomId = room.id;
  });
  socket.emit('JOINED_ROOM', { name: room.name })
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
    for (const client of room.sockets) {
      client.emit('START_GAME', {
        start: SECONDS_TIMER_BEFORE_START_GAME,
        finish: SECONDS_FOR_GAME,
        textId: num
      });
    }
  }
};

const leaveRooms = socket => {
  socket.ready = false;
  const roomsToDelete = [];
  for (const id in rooms) {
    const room = rooms[id];
    const countUsers = room.sockets.length;
    if (room.sockets.includes(socket)) {
      socket.leave(id);
      room.sockets = room.sockets.filter((item) => item !== socket);
    }
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
  }
  socket.roomId = null;

  for (const room of roomsToDelete) {
    delete rooms[room.id];
  }

  return roomsToDelete.length
};

const updateCurrentUsers = room => {
  const currentUsers = room.sockets.map(({ ready, id, username }) => ({ ready, id, username }));
  for (const client of room.sockets) {
    client.emit('NEW_CONNECT', {users: currentUsers, activePlayer: client.username});
  };
};

export default io => {
  io.on('connection', socket => {
    socket.id = generateId();
    const username = socket.handshake.query.username;
    const isntUnique = users.find(user => user === username);
    if (isntUnique) {
      redirectUser(socket)
    } else {
      users.push(username);
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

    socket.on('CORRECT_INPUT', (value) => {
      const room = rooms[socket.roomId];
      for (const client of room.sockets) {
        client.emit('UPDATE_PROGRESS', {
          value,
          id: socket.id
        })
      }

    })

    socket.on('GET_ROOMS', () => {
      const roomNames = [];
      for (const id in rooms) {
        const {
          name,
          available
        } = rooms[id];
        const counterUsers = rooms[id].sockets.length;
        const room = {
          name,
          id,
          count: counterUsers,
          available
        };
        roomNames.push(room);
      }
      socket.emit('ROOM_GOT', roomNames)
    });

    socket.on('CREATE_ROOM', (roomName) => {
      let isUnigue = true;
      for (const key in rooms) {
        const { name } = rooms[key];
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

    socket.on('JOIN_ROOM', (roomId) => {
      const room = rooms[roomId];
      joinRoom(socket, room);
      updateCurrentUsers(room);
      room.sockets.length === MAXIMUM_USERS_FOR_ONE_ROOM && (room.available = false);
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: roomId,
        count: room.sockets.length,
        name: room.name,
        available: room.available
      })
    });

    socket.on('LEAVE_ROOM', () => {
      leaveRooms(socket);
    });

    socket.on('FINISH_GAME', () => {
      const room = rooms[socket.roomId];
      for (const client of room.sockets) {
        client.emit('GET_RESULTS', null);
      }
    });

    socket.on('GET_WINNER', () => {
      const room = rooms[socket.roomId];
      const currentUser = socket.username;
      for (const client of room.sockets) {
        client.emit('GET_RESULTS', currentUser);
      }
    });

    socket.on('disconnect', () => {
      const index = users.findIndex(user => user === socket.username);
      index > -1 && users.splice(index, 1)
      leaveRooms(socket);
    });

  });
};