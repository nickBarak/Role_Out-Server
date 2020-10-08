"use strict";
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
require("dotenv").config();
var port = process.env.PORT || 3001;
var uuid = require("uuid-random");
var activeRooms = [];
var players = {};
var inactiveRooms = {};
var colors = [
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
io.on("connection", function (socket) {
    console.log("New socket connection established");
    players[socket.id] = { room: null, color: null, id: socket.id };
    socket.on("joinRoom", function (config) {
        console.log("joining room...");
        console.log(JSON.stringify(config));
        var rooms = io.sockets.adapter.rooms;
        var roomsOfMode = Object.entries(rooms).filter(function (_a) {
            var key = _a[0];
            return !activeRooms.includes(key) &&
                key.slice(0, 3) === config.join("");
        });
        var availableRooms = roomsOfMode.filter(function (_a) {
            var length = _a[1].length;
            return length < 10;
        });
        if (!Object.keys(availableRooms).length) {
            return socket.emit("errorMessage", "There are currently no rooms in this game mode");
        }
        var room = availableRooms[0][0];
        var color = colors.filter(function (clr) { return !inactiveRooms[room].map(function (_a) {
            var color = _a.color;
            return color;
        }).includes(clr); })[Math.floor(Math.random() * (10 - inactiveRooms[room].length))];
        var player = { room: room, color: color, id: socket.id };
        players[socket.id] = player;
        inactiveRooms[room].push(player);
        socket.join(room);
        socket.emit("joinedRoom", { player: player, room: { room: room, players: inactiveRooms[room] } });
    });
    socket.on("hostRoom", function (config) {
        console.log("hosting room...");
        var room = config.join("") +
            "-" +
            uuid() +
            "-" +
            Object.keys(io.sockets.adapter.rooms).length;
        var color = colors[Math.floor(Math.random() * 10)];
        var player = { room: room, color: color, id: socket.id };
        players[socket.id] = player;
        inactiveRooms[room] = [player];
        socket.join(room);
        socket.emit("joinedRoom", { player: player, room: { room: room, players: inactiveRooms[room] } });
    });
    socket.on("startGame", function (room) {
        console.log("starting game...");
        delete inactiveRooms[room];
        activeRooms.push(room);
    });
    socket.on("chatMessage", function (msg) {
        console.log("sending chat message...");
        io.to(players[socket.id].room).emit("chatMessage", {
            color: players[socket.id].color,
            id: socket.id,
            text: msg
        });
    });
    socket.on("leaveRoom", function () {
        socket.leave(players[socket.id].room);
        players[socket.id] = { room: null, color: null, id: socket.id };
    });
});
server.listen(port, function () { return console.log("Server running on port", port); });
