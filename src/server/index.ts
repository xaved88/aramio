import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import cors from 'cors';
import { GameRoom } from './rooms/GameRoom';

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const server = new Server({
    transport: new WebSocketTransport({
        server: app.listen(port)
    })
});

server.define('game', GameRoom);

app.use('/colyseus', monitor());

console.log(`Server running on port ${port}`); 