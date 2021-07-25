// I just run this if I need to log in on backpack or steam or something
// it is not secure, it is not smart, it is not clever. However it saves me having to open my windows VM so yeah.
// just run it and it prints your steam guard code to the terminal
const steamuser = require('steam-user');
const totp = require('steam-totp');
const config = require('./config.json');

console.log(totp.getAuthCode(config['shared-secret']));