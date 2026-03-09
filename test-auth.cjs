async function test() {
    const email = 'superspedi@spedi.io';
    const password = 'pctspedi';

    console.log('Testing DIRECT BACKEND on port 3001...');
    try {
        const res = await fetch('http://127.0.0.1:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        console.log('Login 3001 status:', res.status, data.session ? 'Got Token' : data);

        if (data.session) {
            const meRes = await fetch('http://127.0.0.1:3001/auth/me', {
                headers: { 'Authorization': `Bearer ${data.session.access_token}` }
            });
            console.log('Me 3001 status:', meRes.status, await meRes.text());
        }
    } catch (err) {
        console.error('3001 Error:', err.message);
    }

    console.log('\nTesting NEXTJS PROXY on port 3000...');
    try {
        const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const text = await res.text();
        console.log('Login 3000 status:', res.status, text.substring(0, 50));
    } catch (err) {
        console.error('3000 Error:', err.message);
    }
}

test();
