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

    // സോക്കറ്റ് കണക്ഷൻ അപ്ഡേറ്റ് വഴി പെയറിങ് കോഡ് ജനറേറ്റ് ചെയ്യുന്നത് ലൂപ്പ് തടയും
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

    // ബോട്ട് രജിസ്റ്റർ ചെയ്തിട്ടില്ലെങ്കിൽ കൃത്യമായ സമയത്ത് പെയറിങ് കോഡ് ചോദിക്കുന്നു
    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = "918086460391";
                let code = await conn.requestPairingCode(phoneNumber);
                console.log(`🔑 NEW PAIRING CODE: ${code}`);
            } catch (error) {
                console.log('Pairing code generation waiting for socket...');
            }
        }, 8000);
    }

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
