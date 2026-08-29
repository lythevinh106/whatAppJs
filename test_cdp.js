const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("Launching browser with profile...");
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

        const browser = await puppeteer.launch({
            headless: false,
            executablePath: executablePath,
            userDataDir: 'C:\\Users\\vinhlt\\Documents\\KBE\\Profile',
            args: ['--remote-debugging-port=9222', '--no-sandbox']
        });

        const pages = await browser.pages();
        let waPage = pages.find(p => p.url().includes('web.whatsapp.com'));

        if (!waPage) {
            console.log("WhatsApp Web tab not found, opening one...");
            waPage = await browser.newPage();
            await waPage.goto('https://web.whatsapp.com');
        }

        console.log("Waiting for WhatsApp Web to load...");
        await waPage.waitForSelector('#pane-side', { timeout: 60000 });

        console.log("Looking for group 'Exhaust cleaning report'...");
        await waPage.waitForSelector('span[title="Exhaust cleaning report"]', { timeout: 30000 });
        await waPage.click('span[title="Exhaust cleaning report"]');
        console.log("Clicked group. Waiting for chat to load...");

        await new Promise(r => setTimeout(r, 5000));

        console.log("Scrolling up to load older messages if needed...");
        // Scroll up logic
        await waPage.evaluate(() => {
            const scrollable = document.querySelector('div[data-testid="conversation-panel-messages"]');
            if (scrollable) {
                scrollable.scrollTop = 0;
            }
        });
        await new Promise(r => setTimeout(r, 3000));

        console.log("Extracting messages...");
        const msgsData = await waPage.evaluate(() => {
            const Chat = window.require('WAWebCollections').Chat;
            const activeChat = Chat.getActive();
            if (!activeChat) return { error: "No active chat" };

            const msgs = activeChat.msgs.getModelsArray().slice(-30);

            // Tìm 1 message là ảnh
            const sampleImage = msgs.find(m => m.type === 'image');

            return {
                chatId: activeChat.id._serialized,
                sampleImageProps: sampleImage ? Object.keys(sampleImage) : [],
                sampleImageDataProps: (sampleImage && sampleImage._data) ? Object.keys(sampleImage._data) : [],
                messages: msgs.map(m => {
                    const data = m._data || m;
                    const res = {};
                    for (let key in data) {
                        if (typeof data[key] !== 'function' && typeof data[key] !== 'object') {
                            res[key] = data[key];
                        }
                    }
                    res.id = m.id ? (m.id._serialized || m.id.id) : null;
                    res.t = m.t;
                    res.type = m.type;

                    if (m.type === 'album') {
                        // try to extract children IDs
                        let children = null;
                        if (Array.isArray(m.msgs)) children = m.msgs;
                        else if (Array.isArray(m.messages)) children = m.messages;
                        else if (Array.isArray(m._models)) children = m._models;
                        else if (m.msgs && typeof m.msgs.getModelsArray === 'function') children = m.msgs.getModelsArray();
                        else if (m.messages && typeof m.messages.getModelsArray === 'function') children = m.messages.getModelsArray();

                        if (children) {
                            res.childrenIds = children.map(c => c.id ? (c.id._serialized || c.id.id) : 'unknown');
                        }
                    }

                    return res;
                })
            };
        });

        console.log("RESULTS:");
        console.dir(msgsData, { depth: null });

        console.log("Leaving browser open for inspection...");
        // process.exit(0);

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();
