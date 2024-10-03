import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { signJwt, verifyJwt } from './lib/jwt.js';
import "https://deno.land/x/dotenv/load.ts";

const
    PORT = Deno.env.get('PORT'),
    CAPTCHA_PUBLIC_KEY = Deno.env.get('CAPTCHA_PUBLIC_KEY'),
    CAPTCHA_PRIVATE_KEY = Deno.env.get('CAPTCHA_PRIVATE_KEY'),
    DISCORD_SECRET = Deno.env.get('DISCORD_SECRET'),
    SESSION_DURATION = Deno.env.get('SESSION_DURATION') || 900000,
    JWT_SECRET = Deno.env.get('JWT_SECRET') || [...crypto.getRandomValues(new Uint8Array(20))].map(item => item.toString(16)).join(''),
    app = new Application(),
    router = new Router();

console.log(`Server started on port ${PORT}`);

app.use(async (context, next) => {
    context.response.headers.set('Access-Control-Allow-Origin', '*');  // Allow any origin
    context.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specific methods
    context.response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type'); // Allow specific headers
    await next();
});

// Serve static files
app.use(async (context, next) => {
    if (context.request.url.pathname === "/") {
        await send(context, "www/index.html");
    } else {
        await next();
    }
});

// CAPTCHA credentials route
router.get('/captcha/credentials', (context) => {
    context.response.body = {
        publicKey: CAPTCHA_PUBLIC_KEY
    };
});

// CAPTCHA validation route
router.get('/captcha/validate', async (context) => {
    const token = context.request.url.searchParams.get('token');
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${CAPTCHA_PRIVATE_KEY}&response=${token}`);
    const { success, score } = await response.json();
    
    console.log(`Receiving a request reaching a score of ${score}`);

    if (!success || score < 0.7) {
        context.response.body = { success: false };
    } else {
        const jwt = await signJwt(
            {
                expirationTimestamp: Date.now() + parseInt(SESSION_DURATION),
            },
            JWT_SECRET
        );
        context.response.body = { success: true, jwt };
    }
});

// CORS options route
router.options('/user/:userId', (context) => {
    context.response.headers.set('access-control-allow-origin', '*');
    context.response.headers.set('access-control-allow-headers', '*');
    context.response.status = 204;
});

// User info route
router.get('/user/:userId', async (context) => {
    try {
        const authHeader = context.request.headers.get('authorization');
        if (!authHeader) {
            context.response.status = 401;
            return;
        }
        
        const token = authHeader.replace(/^Bearer /, '');
        const { expirationTimestamp } = await verifyJwt(token, JWT_SECRET);
        
        if (expirationTimestamp < Date.now()) {
            context.response.status = 401;
        } else {
            const userInfoResponse = await fetch(`https://discord.com/api/v8/users/${context.params.userId}`, {
                method: 'GET',
                headers: {
                    'authorization': `Bot ${DISCORD_SECRET}`
                }
            });
            const userInfo = await userInfoResponse.json();
            context.response.body = userInfo;
        }
    } catch (error) {
        context.response.status = 401;
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
await app.listen({ port: parseInt(PORT) });
