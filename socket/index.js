import * as config from './config';
const {
  MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_TIMER_BEFORE_START_GAME,
  SECONDS_FOR_GAME
} = config;
const rooms = {};
const users = [];
const generateId = function () {
  return '_' + Math.random().toString(36).substr(2, 9);
};

const joinRoom = (socket, room) => {
  socket['ready'] = false;
  room.sockets.push(socket);
  socket.join(room.id, () => {
    socket.roomId = room.id;
  });
  const currentUsers = room.sockets.map(user => {
    return {
      ready: user.ready,
      id: user.id,
      username: user.username
    }
  })
  socket.emit('JOINED_ROOM', {
    name: room.name,
    users: currentUsers,
    available: room.available
  })
};

const redirectUser = (socket) => {
  socket.emit('ERROR_USER', 'User with such username already exist!');
}

const checkStartGame = room => {
  const isAllUsersReady = room.sockets.every((user) => user['ready'] === true);
  if (room.sockets.length === MAXIMUM_USERS_FOR_ONE_ROOM || (isAllUsersReady && room.sockets.length > 1)) {
    const num = Math.floor(Math.random() * 7);
    for (const client of room.sockets) {
      client.emit('START_GAME', {
        start: SECONDS_TIMER_BEFORE_START_GAME,
        finish: SECONDS_FOR_GAME,
        textId: num
      });
    }
  }
} 
const leaveRooms = (socket) => {
  const roomsToDelete = [];
  for (const id in rooms) {
    const room = rooms[id];
    if (room.sockets.includes(socket)) {
      socket.leave(id);
      room.sockets = room.sockets.filter((item) => item !== socket);
    }
    if (room.sockets.length === 0) {
      roomsToDelete.push(room);
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: room.id,
        available: false
      });
    } else {
      checkStartGame(room)
      const currentUsers = room.sockets.map(user => {
        return {
          ready: user.ready,
          id: user.id,
          username: user.username
        }
      })
      for (const client of room.sockets) {
        client.emit('NEW_CONNECT', currentUsers);
      }
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: room.id,
        count: currentUsers.length,
        name: room.name,
        available: room.available
      })
    }
  }
  socket['roomId'] = null;
  for (const room of roomsToDelete) {
    delete rooms[room.id];
  }
  return roomsToDelete.length
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
      socket['username'] = username;
    };

    socket.on('USER_READY', () => {
      const room = rooms[socket.roomId];
      room.sockets.forEach(user => user.id === socket.id && (user['ready'] = true));
      for (const client of room.sockets) {
        client.emit('UPDATE_USER_INDICATOR', socket.id);
      }
      checkStartGame(room)
    });

    socket.on('USER_NOT_READY', () => {
      const room = rooms[socket.roomId];
      room.sockets.forEach(user => user.id === socket.id && (user['ready'] = false));
      for (const client of room.sockets) {
        client.emit('CANCEL_USER_INDICATOR', socket.id);
      }
    })
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
      for (let key in rooms) {
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
        const counterUsers = room.sockets.length;
        socket.broadcast.emit('UPDATE_ROOMS', {
          name: room.name,
          id: room.id,
          count: counterUsers,
          available: room.available
        });
      } else socket.emit('ERROR_ROOM', 'Such room already exist')
    });

    socket.on('JOIN_ROOM', (roomId) => {
      const room = rooms[roomId];
      joinRoom(socket, room);
      const currentUsers = room.sockets.map(user => {
        return {
          ready: user.ready,
          id: user.id,
          username: user.username
        }
      })
      for (const client of room.sockets) {
        client.emit('NEW_CONNECT', currentUsers);
      }
      currentUsers.length === 5 && (room.available = false);
      socket.broadcast.emit('UPDATE_ROOMS', {
        id: roomId,
        count: currentUsers.length,
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
    })

    socket.on('GET_WINNER', () => {
      const room = rooms[socket.roomId];
      const currentUser = socket.username;
      for (const client of room.sockets) {
        client.emit('GET_RESULTS', currentUser);
      }
    })
    socket.on('disconnect', () => {
      const index = users.findIndex(user => user === socket.username);
      index > -1 && users.splice(index, 1)
      leaveRooms(socket);
    });

  });
};