// dungeon-admin/src/services/socket.js
import { io } from 'socket.io-client';

// Usando o Tunnel, você pode abrir este painel de qualquer computador do mundo!
const BACKEND_URL = 'https://exchanges-ordering-disable-session.trycloudflare.com'; 

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ['websocket'], // Mantém a estabilidade via Tunnel
});