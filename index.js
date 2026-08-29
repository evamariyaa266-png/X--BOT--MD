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

    // സുരക്ഷിതമായി കണക്ഷൻ വെച്ച് പെയറിങ് കോഡ് റിക്വസ്റ്റ് ചെയ്യുന്ന രീതി
    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = "918086460391";
                let code = await conn.requestPairingCode(phoneNumber);
                console.log(`🔑 NEW PAIRING CODE: ${code}`);
            } catch (error) {
                console.log('Pairing code generation retrying...');
            }
        }, 6000);
    }

    conn.ev.on('connection.update', async (update) => {
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
