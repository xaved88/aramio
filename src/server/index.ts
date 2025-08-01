import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import cors from 'cors';
import { GameRoom } from './rooms/GameRoom';
import { SERVER_CONFIG } from '../Config';

const port = Number(process.env.PORT || SERVER_CONFIG.PORT);
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