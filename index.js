const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('X-BOT-MD is running!');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"] // പെയറിങ് കോഡ് എളുപ്പത്തിൽ ലഭിക്കാൻ ഇത് സഹായിക്കും
    });

    conn.ev.on('creds.update', saveCreds);

    // X-BOT-MD പെയറിങ് കോഡ് ജനറേഷൻ
    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = "918086460391";
                let code = await conn.requestPairingCode(phoneNumber);
                console.log(`🔑 NEW PAIRING CODE FOR X-BOT-MD: ${code}`);
            } catch (error) {
                console.log('⚠️ Pairing code generation failed. Please wait or restart.');
            }
        }, 5000);
    }

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
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
                    console.log(`Loaded plugin: ${file}`);
                } catch (e) {
                    console.error(`Failed to load plugin ${file}:`, e);
                }
            }
        });
    }
}

startBot();
