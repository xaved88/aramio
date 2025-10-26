import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { GameRoom } from './rooms/GameRoom';
import { LobbyRoom } from './rooms/LobbyRoom';
import { SERVER_CONFIG } from '../ServerConfig';
import { configProvider, GameplayConfig } from './config/ConfigProvider';

const port = Number(process.env.PORT || SERVER_CONFIG.PORT);
const app = express();

// Use shared config provider and load default config
const gameplayConfig: GameplayConfig = configProvider.loadConfig('default');

console.log('Available configs:', configProvider.getAvailableConfigs());

app.use(cors());
app.use(express.json());

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, '../../dist/client')));

// Serve assets from public directory
app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));

const server = new Server({
    transport: new WebSocketTransport({
        server: app.listen(port)
    })
});

server.define('lobby', LobbyRoom, { gameplayConfig });
server.define('game', GameRoom, { gameplayConfig });

app.use('/colyseus', monitor());

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
});

function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2);
}

let lastCpuUsage = process.cpuUsage();
let lastHrTime = process.hrtime();

function logPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const hrTime = process.hrtime();
    const cpuUsage = process.cpuUsage(lastCpuUsage);
    const elapsedTime = (hrTime[0] * 1e9 + hrTime[1] - (lastHrTime[0] * 1e9 + lastHrTime[1])) / 1e6;
    
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000 / elapsedTime * 100).toFixed(2);
    
    console.log(`[Performance] RAM: ${formatBytes(memUsage.heapUsed)}MB used / ${formatBytes(memUsage.heapTotal)}MB total / ${formatBytes(memUsage.rss)}MB RSS | CPU: ${cpuPercent}%`);
    
    lastCpuUsage = process.cpuUsage();
    lastHrTime = process.hrtime();
}

setInterval(logPerformanceMetrics, 30000);

console.log(`Server running on port ${port}`);
console.log('Room types defined: lobby, game'); 
