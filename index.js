const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startXBot() {
    if (!fs.existsSync('./lib/session')) {
        fs.mkdirSync('./lib/session', { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('./lib/session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        version: version,
        logger: pino({ level: 'silent' })
    });

    if (!sock.authState.creds.registered) {
        console.log('\n--- WhatsApp Pairing Code Generator ---');
        const phoneNumber = await question('Enter your WhatsApp number with country code (e.g., 919876543210): ');
        
        // ചെറിയൊരു ഡിലേ നൽകി പെയറിങ് കോഡ് റിക്വസ്റ്റ് ചെയ്യുന്നു
        await new Promise(resolve => setTimeout(resolve, 3000));
        let code = await sock.requestPairingCode(phoneNumber.trim().replace(/[^0-9]/g, ''));
        
        console.log('\n========================================');
        console.log(`YOUR PAIRING CODE IS: ${code}`);
        console.log('========================================\n');
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('X-BOT-MD Successfully Connected and Online!');
        } else if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('Device logged out. Please delete the session folder and restart.');
            } else {
                console.log('Connection closed, reconnecting...');
                startXBot();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startXBot();
