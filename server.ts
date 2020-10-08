const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
require("dotenv").config();
const port = process.env.PORT || 3001;
const uuid = require("uuid-random");

type Color =
	"red" |
	"gold" |
	"blue" |
	"green" |
	"purple" |
	"teal" |
	"pink" |
	"orange" |
	"brown" |
	"gray";

interface Player {
	id:string;
	room:string|null;
	color:Color|null;
}

const activeRooms:string[] = [];
const players:{
	[key:string]: Player
} = {};
const inactiveRooms:{[key:string]:Player[]} = {};
const colors:Color[] = [
	"red",
	"gold",
	"blue",
	"green",
	"purple",
	"teal",
	"pink",
	"orange",
	"brown",
	"gray",
];

interface Room {
	sockets: { [key:string]:boolean };
	length:number;
}

io.on("connection", (socket:any) => {
	console.log("New socket connection established");
	players[socket.id] = { room: null, color: null, id: socket.id };

	socket.on("joinRoom", (config:number[]) => {
		console.log("joining room...");
		console.log(JSON.stringify(config));
		const { rooms }:{[key:string]:Room} = io.sockets.adapter;

		const roomsOfMode:[string, Room][] = Object.entries(rooms).filter(
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
		const color:Color = colors.filter(clr => !inactiveRooms[room].map(({color}) => color).includes(clr))[
			Math.floor(Math.random() * (10 - inactiveRooms[room].length))
		];
		const player = { room, color, id: socket.id };
		players[socket.id] = player;
		inactiveRooms[room].push(player);
		socket.join(room);
		socket.emit("joinedRoom", {player, room: {room, players: inactiveRooms[room] }});
	});

	socket.on("hostRoom", (config:number[]) => {
		console.log("hosting room...");
		const room =
			config.join("") +
			"-" +
			uuid() +
			"-" +
			Object.keys(io.sockets.adapter.rooms).length;
		const color = colors[
			Math.floor(Math.random() * 10)
		];
		const player = { room, color, id: socket.id };
		players[socket.id] = player;
		inactiveRooms[room] = [player];
		socket.join(room);
		socket.emit("joinedRoom", {player, room: {room, players: inactiveRooms[room] }});
	});

	socket.on("startGame", (room:string) => {
		console.log("starting game...");
		delete inactiveRooms[room];
		activeRooms.push(room);
	});

	socket.on("chatMessage", (msg:string) => {
		console.log("sending chat message...");
		io.to(players[socket.id].room).emit("chatMessage", {
			color: players[socket.id].color,
			id: socket.id,
			text: msg
		});
	});

	socket.on("leaveRoom", () => {
		socket.leave(players[socket.id].room);
		players[socket.id] = { room: null, color: null, id: socket.id };
	});
});

server.listen(port, () => console.log("Server running on port", port));
