import pogo from 'https://deno.land/x/pogo@v0.5.2/main.ts';
import { signJwt, verifyJwt } from './lib/jwt.js';

const
    PORT = Deno.env.get('PORT'),
    CAPTCHA_PUBLIC_KEY = Deno.env.get('CAPTCHA_PUBLIC_KEY'),
    CAPTCHA_PRIVATE_KEY = Deno.env.get('CAPTCHA_PRIVATE_KEY'),
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
    if(!success || score < 0.9) return {
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

server.start();