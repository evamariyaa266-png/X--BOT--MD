const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('EVA-MARIYA-MD is running!');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false
    });

    conn.ev.on('creds.update', saveCreds);

    // Request pairing code logic
    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            let phoneNumber = process.env.PHONE_NUMBER;
            if (phoneNumber) {
                let code = await conn.requestPairingCode(phoneNumber.trim());
                console.log(`🔑 NEW PAIRING CODE: ${code}`);
            } else {
                console.log('⚠️ Please set PHONE_NUMBER in Render Environment Variables to get the pairing code.');
            }
        }, 4000);
    }

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('Connected successfully! EVA-MARIYA is active.');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    // Automatically load all plugins
    const pluginsPath = path.join(__dirname, 'plugins');
    if (fs.existsSync(pluginsPath)) {
        fs.readdirSync(pluginsPath).forEach((file) => {
            if (file.endsWith('.js')) {
                try {
                    require('./plugins/' + file);
                    console.log(`Loaded plugin: ${file}`);
                } catch (e) {
                    console.error(`Failed to load plugin ${file}:`, e);
                }
            }
        });
    }
}

startBot();
