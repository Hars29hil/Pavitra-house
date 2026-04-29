const express = require("express");
const cors = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const app = express();

console.log("\n🚀 WHATSAPP BACKEND STARTING (v1.1) 🚀\n");

// Test Route
app.get("/api/test", (req, res) => res.json({ success: true, message: "Backend v1.1 is active" }));

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

let client;

function initializeClient() {
    if (client && client.pupBrowser) {
        console.log("🧹 Cleaning up existing client browser...");
        try { client.destroy(); } catch (e) { }
    }

    console.log("🛠️ Initializing WhatsApp Client...");

    client = new Client({
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
                "--disable-gpu",
                "--single-process"
            ]
        }
    });

    client.initialize().catch(err => {
        console.error("❌ FAILED TO INITIALIZE CLIENT:", err);
    });

    /* =======================
       WHATSAPP EVENTS
    ======================= */
    client.on("qr", async (qr) => {
        console.log("\n📲 QR RECEIVED — Scan with WhatsApp\n");
        qrcodeTerminal.generate(qr, { small: true });
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

    client.on("disconnected", async (reason) => {
        console.log("❌ WhatsApp Disconnected:", reason);
        isReady = false;
        isAuthenticated = false;
        global.qrCode = null;

        try {
            console.log("🔄 Re-initializing in 2 seconds...");
            setTimeout(initializeClient, 2000);
        } catch (e) {
            console.error("❌ Failed to trigger re-initialization:", e);
        }
    });

}

/* =======================
   INIT CLIENT
======================= */
initializeClient();

/* =======================
   ROUTES
======================= */

// Health Check
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "WhatsApp API successfully running (QR + Logs Enabled)"
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
        connected: isReady,
        authenticated: isAuthenticated,
        hasQr: !!global.qrCode
    });
});

// Reconnect/Restart Client
app.post("/api/reconnect", async (req, res) => {
    console.log("🔄 Manual Reconnect Requested");
    try {
        isReady = false;
        isAuthenticated = false;
        global.qrCode = null;

        // Try to destroy first if possible
        try {
            await client.destroy();
        } catch (e) {
            console.warn("⚠️ Client destroy failed (probably not initialized):", e.message);
        }

        // Re-initialize
        initializeClient();

        res.json({ success: true, message: "Re-initializing WhatsApp client..." });
    } catch (err) {
        console.error("❌ Reconnect Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Logout (Delete Session)
app.post("/api/logout", async (req, res) => {
    console.log("🚪 Logout Requested");
    try {
        isReady = false;
        isAuthenticated = false;
        global.qrCode = null;

        try {
            await client.logout();
            await client.destroy();
        } catch (e) {
            console.warn("⚠️ Logout/Destroy failed:", e.message);
        }

        // Re-initialize (this will generate a fresh QR since we logged out)
        initializeClient();

        res.json({ success: true, message: "Logged out and re-initializing..." });
    } catch (err) {
        console.error("❌ Logout Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Reset Session (Hard Reset)
app.post("/api/reset-session", async (req, res) => {
    console.log("🧨 HARD RESET REQUESTED");
    try {
        isReady = false;
        isAuthenticated = false;
        global.qrCode = null;

        // 1. Destroy client
        try {
            if (client) await client.destroy();
        } catch (e) {
            console.warn("⚠️ Destroy failed:", e.message);
        }

        // 2. Delete Auth Folder
        const authPath = path.join(__dirname, ".wwebjs_auth");
        if (fs.existsSync(authPath)) {
            console.log("🗑️ Deleting auth folder...");
            fs.rmSync(authPath, { recursive: true, force: true });
        }

        // 3. Re-initialize
        initializeClient();

        res.json({ success: true, message: "Session reset. Generating new QR..." });
    } catch (err) {
        console.error("❌ Reset Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
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
        // 1. Remove all non-numeric characters
        let sanitized = number.toString().replace(/\D/g, "");

        // 2. Auto-fix common Indian number formats
        if (sanitized.length === 10) {
            // Assume Indian number if 10 digits
            sanitized = "91" + sanitized;
        } else if (sanitized.length === 11 && sanitized.startsWith("0")) {
            // Convert 09876... to 919876...
            sanitized = "91" + sanitized.substring(1);
        } else if (sanitized.length === 12 && sanitized.startsWith("91")) {
            // Already has country code, do nothing
        }

        console.log(`🚀 Sending to sanitized number: ${sanitized}`);

        try {
            // Try to format it correctly for WhatsApp
            const chatId = sanitized.includes('@c.us') ? sanitized : `${sanitized}@c.us`;

            // OPTIONAL: Verify if the number is registered (but don't crash if it fails)
            try {
                const isRegistered = await client.isRegisteredUser(sanitized);
                if (!isRegistered) {
                    console.warn(`⚠️ Number ${sanitized} might not be on WhatsApp. Trying anyway...`);
                }
            } catch (regErr) {
                console.warn("⚠️ Could not verify registration, proceeding anyway.");
            }
            console.log(`📝 Using Chat ID: ${chatId}`);

            await client.sendMessage(chatId, message);
            res.json({ success: true, message: "Message sent" });
        } catch (innerErr) {
            console.error("❌ Inner Send Error:", innerErr);
            // One last attempt with direct string ID
            try {
                await client.sendMessage(`${sanitized}@c.us`, message);
                res.json({ success: true, message: "Message sent via direct JID" });
            } catch (finalErr) {
                throw finalErr;
            }
        }

    } catch (err) {
        console.error("❌ FINAL SEND ERROR:", err);
        res.status(500).json({
            success: false,
            error: err.message,
            details: "Could not resolve WhatsApp ID. Check if the number is correct and has a country code."
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
