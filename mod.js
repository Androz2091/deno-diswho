import pogo from 'https://deno.land/x/pogo@v0.5.2/main.ts';
import { signJwt, verifyJwt } from './lib/jwt.js';

const server = pogo.server({
    port: parseInt(Deno.env.get('PORT'))
});

server.start();