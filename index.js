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
    if (qrCodeData) {
        res.send(`
            <html>
                <body style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                    <h2>X-BOT-MD WhatsApp QR Code</h2>
                    <p>Scan this QR code with your WhatsApp app to link your device.</p>
                    <img src="${qrCodeData}" alt="QR Code" style="width: 300px; height: 300px;"/>
                    <p>Refresh the page if the QR code expires.</p>
                </body>
            </html>
        `);
    } else {
        res.send('<h2>X-BOT-MD is running. Generating QR code, please wait and refresh the page...</h2>');
    }
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

    // ക്യുആർ കോഡ് ജനറേറ്റ് ചെയ്ത് വെബ് പേജിൽ കാണിക്കാൻ
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = await qrcode.toDataURL(qr);
            console.log('📱 New QR Code generated. Open your Render web URL to scan it.');
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

    // പ്ലഗിനുകൾ ലോഡ് ചെയ്യാൻ
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
