const express = require("express");
const cors = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");

const app = express();

/* =======================
   GLOBAL ERROR HANDLERS
======================= */
process.on("uncaughtException", (err) => {
    console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("🔥 UNHANDLED REJECTION:", reason);
});

/* =======================
   CORS
======================= */
app.use(cors({
    origin: "*", // Allow all origins (Public API)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"]
}));

app.use(express.json());

/* =======================
   API REQUEST LOGGER
======================= */
app.use((req, res, next) => {
    if (req.originalUrl === "/api/qr" || req.originalUrl === "/api/status") return next();
    
    const time = new Date().toISOString();
    console.log(`📡 [${time}] ${req.method} ${req.originalUrl}`);

    if (req.body && Object.keys(req.body).length > 0) {
        console.log("📦 BODY:", req.body);
    }

    next();
});

/* =======================
   WHATSAPP CLIENT
======================= */
let isReady = false;
let isAuthenticated = false;
global.qrCode = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--renderer-process-limit=1",
            "--disable-extensions"
        ]
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

/* =======================
   WHATSAPP EVENTS
======================= */
client.on("qr", async (qr) => {
    console.log("\n📲 QR RECEIVED — Scan with WhatsApp\n");

    // ✅ TERMINAL QR
    qrcodeTerminal.generate(qr, { small: true });

    // ✅ FRONTEND QR
    try {
        global.qrCode = await qrcode.toDataURL(qr);
        console.log("✅ Frontend QR set successfully. Length:", global.qrCode.length);
    } catch (err) {
        console.error("❌ Error generating frontend QR:", err);
    }
});

client.on("ready", () => {
    console.log("\n✅ WhatsApp Connected & Ready\n");
    isReady = true;
});

client.on("authenticated", () => {
    console.log("🔐 WhatsApp Authenticated");
    isAuthenticated = true;
    global.qrCode = null;
});

client.on("auth_failure", (msg) => {
    console.error("❌ WhatsApp Auth Failure:", msg);
});

client.on("loading_screen", (percent, message) => {
    console.log(`⏳ WhatsApp Loading: ${percent}% - ${message}`);
});

client.on("disconnected", (reason) => {
    console.log("❌ WhatsApp Disconnected:", reason);
    isReady = false;
    isAuthenticated = false;
    global.qrCode = null;
    
    // Attempt auto-reconnect on disconnect
    try {
        client.initialize();
    } catch(e) {}
});

/* =======================
   INIT CLIENT
======================= */
client.initialize();

/* =======================
   ROUTES
======================= */

// Health Check
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "WhatsApp API running (QR + Logs Enabled)"
    });
});

// Get QR
app.get("/api/qr", (req, res) => {
    if (isReady) {
        return res.json({ success: true, message: "Already connected" });
    }

    if (isAuthenticated) {
        return res.json({ success: true, message: "Authenticated, loading..." });
    }

    if (global.qrCode) {
        return res.json({ success: true, qr: global.qrCode });
    }

    res.json({ success: false, message: "QR not generated yet" });
});

// Status
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        connected: isReady
    });
});

// Send Message
app.post("/api/send", async (req, res) => {
    const { number, message } = req.body;

    console.log(`📩 SEND REQUEST → ${number}`);

    if (!isReady) {
        return res.status(400).json({
            success: false,
            message: "WhatsApp not connected"
        });
    }

    if (!number || !message) {
        return res.status(400).json({
            success: false,
            message: "Number and message required"
        });
    }

    try {
        let sanitized = number.toString().replace(/\D/g, "");

        if (sanitized.length === 10) {
            sanitized = "91" + sanitized;
        }

        console.log(`🚀 Sending to: ${sanitized}`);

        let numberId;
        try {
            numberId = await client.getNumberId(sanitized);
        } catch { }

        if (numberId) {
            await client.sendMessage(numberId._serialized, message);
        } else {
            await client.sendMessage(`${sanitized}@c.us`, message);
        }

        res.json({ success: true, message: "Message sent" });

    } catch (err) {
        console.error("❌ SEND ERROR:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Send Message to Group
app.post("/api/send-group", async (req, res) => {
    const { groupLink, message } = req.body;

    console.log(`📩 GROUP SEND REQUEST → ${groupLink}`);

    if (!isReady) {
        return res.status(400).json({
            success: false,
            message: "WhatsApp not connected"
        });
    }

    if (!groupLink || !message) {
        return res.status(400).json({
            success: false,
            message: "Group link and message required"
        });
    }

    try {
        let inviteCode = groupLink;
        if (groupLink.includes('chat.whatsapp.com/')) {
            inviteCode = groupLink.split('chat.whatsapp.com/')[1].split('/')[0].split('?')[0];
        }

        console.log(`🚀 Sending to group invite code: ${inviteCode}`);

        const groupId = await client.acceptInvite(inviteCode);
        await client.sendMessage(groupId, message);

        res.json({ success: true, message: "Message sent to group" });

    } catch (err) {
        console.error("❌ GROUP SEND ERROR:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/* =======================
   SERVER START
======================= */
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server running on port ${PORT}\n`);
});
