const config = require('./config.json');
const { SCARF, } = require('../lib');

const client = new SCARF(config, {
    disableEveryone: true,
});

client.on('ready', () => {
    console.log('Bot started!');
});

client.setup();