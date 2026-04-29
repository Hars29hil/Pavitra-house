const express = require("express");
const cors = require("cors");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const pino = require("pino");

const app = express();
const logger = pino({ level: "info" });

console.log("\n🚀 WHATSAPP BACKEND STARTING (Baileys v1.0) 🚀\n");

/* =======================
   GLOBAL STATE
======================= */
let sock = null;
let isReady = false;
let qrCode = null;
let connectionStatus = "Disconnected";

/* =======================
   CORS & MIDDLEWARE
======================= */
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

/* =======================
   WHATSAPP CONNECTION
======================= */
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "baileys_auth"));
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: true,
        logger,
        browser: ["Pavitra House", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📲 New QR Code Received");
            qrCode = await qrcode.toDataURL(qr);
        }

        if (connection === "close") {
            isReady = false;
            qrCode = null;
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Connection closed. Reason:", lastDisconnect?.error?.message, "Reconnecting:", shouldReconnect);
            connectionStatus = "Disconnected";
            
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000);
            }
        } else if (connection === "open") {
            console.log("\n✅ WhatsApp Connected Successfully!\n");
            isReady = true;
            qrCode = null;
            connectionStatus = "Connected";
        } else if (connection === "connecting") {
            connectionStatus = "Connecting...";
        }
    });

    // Listen for messages if needed (optional)
    sock.ev.on("messages.upsert", async (m) => {
        // console.log("New Message:", JSON.stringify(m, undefined, 2));
    });
}

// Start connection
connectToWhatsApp().catch(err => console.error("Initial connection error:", err));

/* =======================
   API ROUTES
======================= */

// Health Check
app.get("/", (req, res) => {
    res.json({ success: true, message: "Baileys WhatsApp API Running", status: connectionStatus });
});

// Get QR
app.get("/api/qr", (req, res) => {
    if (isReady) {
        return res.json({ success: true, message: "Already connected" });
    }
    if (qrCode) {
        return res.json({ success: true, qr: qrCode });
    }
    res.json({ success: false, message: "QR not generated yet" });
});

// Status
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        connected: isReady,
        status: connectionStatus,
        hasQr: !!qrCode
    });
});

// Send Message
app.post("/api/send", async (req, res) => {
    const { number, message } = req.body;

    if (!isReady) {
        return res.status(400).json({ success: false, message: "WhatsApp not connected" });
    }

    try {
        // Sanitize number
        let sanitized = number.toString().replace(/\D/g, "");
        if (sanitized.length === 10) sanitized = "91" + sanitized;
        
        const jid = `${sanitized}@s.whatsapp.net`;
        
        await sock.sendMessage(jid, { text: message });
        console.log(`📩 Sent message to ${jid}`);
        
        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        console.error("❌ Send Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Reset Session (Logout)
app.post("/api/reset-session", async (req, res) => {
    try {
        console.log("🧨 Resetting Session...");
        const authPath = path.join(__dirname, "baileys_auth");
        
        if (sock) {
            try { await sock.logout(); } catch (e) {}
        }
        
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        isReady = false;
        qrCode = null;
        
        // Wait 1s and restart
        setTimeout(connectToWhatsApp, 1000);
        
        res.json({ success: true, message: "Session reset successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Logout
app.post("/api/logout", async (req, res) => {
    try {
        if (sock) await sock.logout();
        res.json({ success: true, message: "Logged out" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* =======================
   START SERVER
======================= */
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`📡 Server listening on port ${PORT}`);
});
