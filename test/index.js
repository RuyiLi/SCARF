const config = require('./config.json');
const { SCARF, } = require('../lib'); // Replace `../lib` with `scarf-djs` in your project.

const client = new SCARF(config, {
    disableEveryone: true,
});

client.on('ready', () => {
    console.log('Bot started!');
});

client.setup();