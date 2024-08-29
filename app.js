
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());

const rooms = new Map();  

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', (username) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms.set(roomId, { creator: username, users: [] });
    socket.join(roomId);
    console.log(`Room created: ${roomId} by ${username}`);
    socket.emit('room-created', { roomId, username });
    socket.to(roomId).emit('user-connected', { userId: socket.id, username });
  });

  socket.on('join-room', ({ roomId, username }, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.join(roomId);
      room.users.push({ userId: socket.id, username });
      console.log(`User ${username} joined room: ${roomId}`);
      
      // Notify other users in the room
      socket.to(roomId).emit('user-connected', { userId: socket.id, username });
      
      // Send success response back to the client
      if (callback) {
        callback({ success: true });
      }
    } else {
      // Room not found, send error response back to the client
      if (callback) {
        callback({ success: false, message: 'Room not found' });
      }
    }
  });

  socket.on('offer', (roomId, offer) => {
    socket.to(roomId).emit('offer', socket.id, offer);
  });

  socket.on('answer', (roomId, answer) => {
    socket.to(roomId).emit('answer', socket.id, answer);
  });

  socket.on('ice-candidate', (roomId, candidate) => {
    socket.to(roomId).emit('ice-candidate', socket.id, candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from room and delete room if empty
    rooms.forEach((room, roomId) => {
      room.users = room.users.filter(user => user.userId !== socket.id);
    });

    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
