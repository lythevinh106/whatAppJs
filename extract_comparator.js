const { Client, LocalAuth } = require('./index.js');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

const client = new Client({
    puppeteer: {
        headless: true,
        executablePath: executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    try {
        const info = await client.pupPage.evaluate(() => {
            const WAWebCollections = window.require('WAWebCollections');
            const Msg = WAWebCollections.Msg;
            // Create a dummy message
            const dummy = new (Msg.modelClass || Msg)({
                id: { fromMe: true, remote: '123@c.us', id: '12345' },
                body: 'test'
            });
            
            // Get all property names including non-enumerable
            let props = [];
            let obj = dummy;
            while (obj) {
                props = props.concat(Object.getOwnPropertyNames(obj));
                obj = Object.getPrototypeOf(obj);
            }
            
            return {
                props: [...new Set(props)]
            };
        });
        console.log("PROPS:");
        console.log(JSON.stringify(info, null, 2));
    } catch (err) {
        console.error("Error evaluating:", err);
    }
    process.exit(0);
});

client.initialize();
