import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { GameRoom } from './rooms/GameRoom';
import { SERVER_CONFIG } from '../ServerConfig';
import { ConfigProvider, GameplayConfig } from './config/ConfigProvider';

const port = Number(process.env.PORT || SERVER_CONFIG.PORT);
const app = express();

// Initialize config provider and load default config
const configProvider = new ConfigProvider();
const gameplayConfig: GameplayConfig = configProvider.loadConfig('default');

app.use(cors());
app.use(express.json());

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, '../../dist/client')));

const server = new Server({
    transport: new WebSocketTransport({
        server: app.listen(port)
    })
});

server.define('game', GameRoom, { gameplayConfig });

app.use('/colyseus', monitor());

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
});

console.log(`Server running on port ${port}`); 
