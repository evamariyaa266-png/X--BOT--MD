const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

async function startXBot() {
    // സെഷൻ ഫോൾഡർ ഇല്ലെങ്കിൽ ക്രിയേറ്റ് ചെയ്യുന്നു
    if (!fs.existsSync('./lib/session')) {
        fs.mkdirSync('./lib/session', { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('./lib/session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // ടേർമിനലിൽ ക്യുആർ കോഡ് പ്രിന്റ് ചെയ്യാൻ ഇത് true ആക്കി മാറ്റിയിരിക്കുന്നു
        version: version,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'connecting') {
            console.log('Connecting to WhatsApp... Please wait.');
        } else if (connection === 'open') {
            console.log('X-BOT-MD Successfully Connected and Online!');
            
            // ലോക്കൽ പ്ലഗിനുകൾ ലോഡ് ചെയ്യാൻ
            if (fs.existsSync('./plugins')) {
                fs.readdirSync('./plugins').filter(file => path.extname(file) === '.js').forEach(file => {
                    require('./plugins/' + file);
                });
                console.log('Plugins loaded successfully.');
            }
        } else if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('Device logged out. Please delete session folder and scan QR again.');
            } else {
                console.log('Connection closed, reconnecting...');
                startXBot();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        // മെസ്സേജുകൾ ഹാൻഡിൽ ചെയ്യാനുള്ള ഭാഗം
        if (!m.messages) return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        console.log('New message received from:', msg.key.remoteJid);
    });
}

startXBot();
