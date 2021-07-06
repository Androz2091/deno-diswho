import pogo from 'https://deno.land/x/pogo@v0.5.2/main.ts';
import { signJwt, verifyJwt } from './lib/jwt.js';

const
    PORT = Deno.env.get('PORT'),
    CAPTCHA_PUBLIC_KEY = Deno.env.get('CAPTCHA_PUBLIC_KEY'),
    CAPTCHA_PRIVATE_KEY = Deno.env.get('CAPTCHA_PRIVATE_KEY'),
    DISCORD_SECRET = Deno.env.get('DISCORD_SECRET'),
    SESSION_DURATION = Deno.env.get('SESSION_DURATION') || 900000,
    JWT_SECRET = Deno.env.get('JWT_SECRET') || [...crypto.getRandomValues(new Uint8Array(20))].map(item => item.toString(16)).join(''),
    server = pogo.server({
        port: parseInt(PORT)
    });

server.router.get('/', (request, h) => h.file('www/index.html'));

server.router.get('/captcha/credentials', () => ({
    publicKey: CAPTCHA_PUBLIC_KEY
}));

server.router.get('/captcha/validate', async request => {
    const {
        success,
        score
    } = await (await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${CAPTCHA_PRIVATE_KEY}&response=${request.searchParams.get('token')}`)).json();
    console.log(`Receiving a request reaching a score of ${score}`);
    if(!success || score < 0.7) return {
        success: false
    };
    else return {
        success: true,
        jwt: await signJwt(
            {
                expirationTimestamp: Date.now() + parseInt(SESSION_DURATION)
            },
            JWT_SECRET
        )
    }
});

server.route({
    method: 'OPTIONS',
    path: '/user/{userId}',
    handler: (request, h) => {
        const response = h.response();
        response.headers.append('access-control-allow-origin', '*');
        response.headers.append('access-control-allow-headers', '*');
        return response;
    }
});

server.router.get('/user/{userId}', async (request, h) => {
    const response = h.response();
    response.headers.append('access-control-allow-origin', '*');
    response.headers.append('access-control-allow-headers', '*');
    try {
        const {
            expirationTimestamp
        } = await verifyJwt(request.headers.get('authorization').replace(/^Bearer /, ''), JWT_SECRET);
        if(expirationTimestamp < Date.now())
            response.code(401);
        else 
            response.body = await (await fetch(`https://discord.com/api/v8/users/${request.params.userId}`, {
                method: 'GET',
                headers: {
                    'authorization': `Bot ${DISCORD_SECRET}`
                }
            })).json();
    }
    catch {
        response.code(401);
    }
    return response;
});

server.start();