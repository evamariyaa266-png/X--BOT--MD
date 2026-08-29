const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeData = '';

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>X-BOT-MD QR Code</title>
                <meta http-equiv="refresh" content="15">
            </head>
            <body style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h2>X-BOT-MD WhatsApp QR Code</h2>
                <p>Scan this QR code with your WhatsApp. The page will auto-refresh for a fresh code.</p>
                ${qrCodeData ? `<img src="${qrCodeData}" alt="QR Code" style="width: 300px; height: 300px;"/>` : `<h3>Generating QR Code, please wait...</h3>`}
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = await qrcode.toDataURL(qr);
            console.log('📱 New QR Code generated.');
        }

        if (connection === 'open') {
            qrCodeData = '';
            console.log('✅ Connected successfully! X-BOT-MD is active.');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    const pluginsPath = path.join(__dirname, 'plugins');
    if (fs.existsSync(pluginsPath)) {
        fs.readdirSync(pluginsPath).forEach((file) => {
            if (file.endsWith('.js')) {
                try {
                    require('./plugins/' + file);
                } catch (e) {}
            }
        });
    }
}

startBot();
