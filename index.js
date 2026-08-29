const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
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
        printQRInTerminal: false, // QR കോഡിന് പകരം പെയറിങ് കോഡ് ഉപയോഗിക്കാൻ ഇത് false വെക്കുക
        version: version,
        logger: pino({ level: 'silent' })
    });

    // പെയറിങ് കോഡ് ഓപ്ഷൻ
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Please enter your WhatsApp number (e.g., 919876543210): ');
        let code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`Your Pairing Code: ${code}`);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('X-BOT-MD Successfully Connected and Online!');
        } else if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('Device logged out. Please delete session folder and restart.');
            } else {
                console.log('Connection closed, reconnecting...');
                startXBot();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startXBot();
