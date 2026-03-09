const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const jwk = {
    alg: "ES256",
    crv: "P-256",
    ext: true,
    key_ops: ["verify"],
    kid: "92519ad8-b2bb-4309-a340-aefa2124d22d",
    kty: "EC",
    use: "sig",
    x: "sT5ILFXa2F628UksfbhY7fSkzPpbJHVwQ82wH-xTtLc",
    y: "yTO-RjAPv7B3wyUWlJjykvIpx-6Nfq8qGlHiO9H39OY"
};

const publicKey = crypto.createPublicKey({
    key: jwk,
    format: 'jwk'
});

async function test() {
    const email = 'superspedi@spedi.io';
    const password = 'pctspedi';

    try {
        const res = await fetch('http://127.0.0.1:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        const token = data.session.access_token;

        console.log('Login Token:', token.substring(0, 30) + '...');

        try {
            const decoded = jwt.verify(token, publicKey.export({ type: 'spki', format: 'pem' }), { algorithms: ['ES256'] });
            console.log('Verify Success:', decoded);
        } catch (e) {
            console.log('Verify string Error:', e.message);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
