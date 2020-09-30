const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
require("dotenv").config();
const port = process.env.PORT || 3001;
const uuid = require("uuid-random");

const activeRooms = [];
const players = {};
const inactiveRooms = {};
const colors = [
    'red',
    'gold',
    'blue',
    'green',
    'purple',
    'teal',
    'pink',
    'orange',
    'brown',
    'gray'
];

io.on("connection", socket => {
    console.log("New socket connection established");
    players[socket.id] = {room: null, color: null};

	socket.on("joinRoom", config => {
		console.log("joining room...");
        console.log(JSON.stringify(config));
		const { rooms } = io.sockets.adapter;
		const roomsOfMode = Object.entries(rooms).filter(
            ([key]) =>
                !activeRooms.includes(key) &&
				key.slice(0, 3) === config.join("")
        );
		const availableRooms = roomsOfMode.filter(
			([, { length }]) => length < 10
        );
		if (!Object.keys(availableRooms).length) {
			return socket.emit(
				"errorMessage",
				"There are currently no rooms in this game mode"
			);
		}
        const room = availableRooms[0][0];
        const color = colors
            .filter(clr => !inactiveRooms(room).includes(clr))
            [Math.floor(Math.random() * (10-inactiveRooms(room).length))];
		players[socket.id].room = room;
        socket.join(room);
        socket.emit('joinedRoom', {room, color});
	});

	socket.on("hostRoom", config => {
		console.log("hosting room...");
		const room =
			config.join("") +
			"-" +
			uuid() +
			"-" +
            Object.keys(io.sockets.adapter.rooms).length;
        const color = colors
            .filter(clr => !inactiveRooms(room).includes(clr))
            [Math.floor(Math.random() * (10-inactiveRooms(room).length))];
		players[socket.id].room = room;
        socket.join(room);
        socket.emit('joinedRoom', {room, color});
	});

	socket.on("startGame", room => {
        console.log("starting game...");
        inactiveRooms.splice(inactiveRooms.indexOf(room), 1);
		activeRooms.push(room);
	});

	socket.on("chatMessage", msg => {
        console.log("sending chat message...");
		io.to(players[socket.id].room).emit("chatMessage", msg);
    });
    
    socket.on('leaveRoom', () => {
        socket.leave(players[socket.id].room);
        players[socket.id] = {room: null, color: null};
    });
});

server.listen(port, () => console.log("Server running on port", port));
