if (!client.authState.creds.registered) {
    const readline = require("readline");
    const question = (text) => new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(text, (answer) => { rl.close(); resolve(answer); });
    });
    
    // ടെർമിനലിൽ നമ്പർ ചോദിക്കുന്ന കോഡ് അല്ലെങ്കിൽ റെണ്ടർ ലോങ്സിൽ കാണുന്ന രീതി
    let phoneNumber = await question('Please enter your WhatsApp phone number (e.g., 919847xxxxxx): ');
    let code = await client.requestPairingCode(phoneNumber.trim());
    console.log(`🔑 NEW PAIRING CODE: ${code}`);
}
