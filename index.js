const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('X-BOT-MD is running and ready for connection!');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true, // ഇത് ലോഗ്സിൽ ക്യുആർ കോഡ് കാണിക്കാൻ സഹായിക്കും
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 QR CODE RECEIVED. Please check terminal/logs to scan.');
        }

        if (connection === 'open') {
            console.log('✅ Connected successfully! X-BOT-MD is active.');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('⚠️ Connection closed. Reconnecting...');
                startBot();
            } else {
                console.log('❌ Connection logged out.');
            }
        }
    });
}

startBot();
