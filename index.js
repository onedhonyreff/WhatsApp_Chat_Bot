"use strict";
const {
    default: makeWASocket,
    BufferJSON,
    initInMemoryKeyStore,
    DisconnectReason,
    AnyMessageContent,
    useMultiFileAuthState,
    delay,
    generateWAMessageFromContent,
} = require("@adiwajshing/baileys");
const figlet = require("figlet");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const chalk = require("chalk");
const logg = require("pino");
const clui = require("clui");
const { Spinner } = clui;
const { serialize } = require("./lib/myfunc");
const { color, mylog, infolog } = require("./lib/color");
const time = moment(new Date()).format("HH:mm:ss DD/MM/YYYY");
let setting = JSON.parse(fs.readFileSync("./config.json"));
const { OpenAI } = require("openai");
const qrcode = require("qrcode-terminal");

const AUTH_INFO_PATH = "./auth_info";
let serverListeningStatus = false;

const openai = new OpenAI({
    apiKey:
        setting.AI_MODE === "PAWAN_KRD_REVERSE"
            ? setting.PAWAN_OPENAI_KEY
            : setting.OPENAI_KEY,
    baseURL:
        setting.AI_MODE === "PAWAN_KRD_REVERSE"
            ? setting.PAWAN_BASE_URL
            : setting.AI_MODE === "MY_OWN_REVERSE"
            ? setting.SELF_HOSTED_BASE_URL
            : "https://api.openai.com/v1",
});

/**
 * Uncache if there is file change;
 * @param {string} module Module name or path;
 * @param {function} cb <optional> ;
 */
function nocache(module, cb = () => {}) {
    console.log(`Module ${module} sedang diperhatikan terhadap perubahan`);
    fs.watchFile(require.resolve(module), async () => {
        await uncache(require.resolve(module));
        cb(module);
    });
}
/**
 * Uncache a module
 * @param {string} module Module name or path;
 */
function uncache(module = ".") {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(module)];
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

const status = new Spinner(chalk.cyan(` Booting WhatsApp Bot`));
const starting = new Spinner(chalk.cyan(` Preparing After Connect`));
const reconnect = new Spinner(chalk.redBright(` Reconnecting WhatsApp Bot`));

async function fanStart() {
    const connectToWhatsApp = async () => {
        const { state, saveCreds } = await useMultiFileAuthState(
            AUTH_INFO_PATH
        );
        const conn = makeWASocket({
            version: [2, 2323, 4],
            printQRInTerminal: true,
            logger: logg({ level: "fatal" }),
            auth: state,
            browser: ["OpenAI BOT", "Safari", "3.0"],
            getMessage: async (key) => {
                return {};
            },
        });

        /* Auto Update */
        require("./lib/myfunc");
        require("./message/msg");
        nocache("./lib/myfunc", (module) =>
            console.log(
                chalk.greenBright("[ WHATSAPP BOT ]  ") +
                    time +
                    chalk.cyanBright(` "${module}" Telah diupdate!`)
            )
        );
        nocache("./message/msg", (module) =>
            console.log(
                chalk.greenBright("[ WHATSAPP BOT ]  ") +
                    time +
                    chalk.cyanBright(` "${module}" Telah diupdate!`)
            )
        );

        conn.multi = true;
        conn.nopref = false;
        conn.prefa = "prefa";

        conn.ev.on("messages.upsert", async (m) => {
            if (!m.messages) return;
            var msg = m.messages[0];
            try {
                if (msg.message.messageContextInfo)
                    delete msg.message.messageContextInfo;
            } catch {}
            msg = serialize(conn, msg);
            msg.isBaileys = msg.key.id.startsWith("BAE5");
            require("./message/msg")(
                conn,
                msg,
                m,
                openai,
                serverListeningStatus,
                (newStatus) => {
                    serverListeningStatus = newStatus;
                }
            );
        });

        conn.ev.on("connection.update", (update) => {
            if (global.qr !== update.qr) {
                global.qr = update.qr;
            }
            const { connection, lastDisconnect, qr } = update;
            console.log(update);

            if (qr) qrcode.generate(qr, { small: true });

            if (connection === "close") {
                var statusCode =
                    lastDisconnect.error?.output?.statusCode ??
                    "unknown status code";
                console.log(statusCode);
                if (statusCode == DisconnectReason.loggedOut) {
                    console.log("connection logged out...");
                    deleteAuthInfo();
                }
                connectToWhatsApp();
            } else if (connection === "open") {
                console.log("koneksi terhubung");
            }
        });

        conn.ev.on("creds.update", await saveCreds);

        conn.reply = (from, content, msg) =>
            conn.sendMessage(from, { text: content }, { quoted: msg });

        conn.sendMessageFromContent = async (jid, message, options = {}) => {
            var option = { contextInfo: {}, ...options };
            var prepare = await generateWAMessageFromContent(
                jid,
                message,
                option
            );
            await conn.relayMessage(jid, prepare.message, {
                messageId: prepare.key.id,
            });
            return prepare;
        };

        return conn;
    };

    connectToWhatsApp().catch((err) => console.log(err));
}

function deleteAuthInfo() {
    if (fs.existsSync(AUTH_INFO_PATH)) {
        fs.readdirSync(AUTH_INFO_PATH).forEach((file, index) => {
            const curPath = path.join(AUTH_INFO_PATH, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(AUTH_INFO_PATH);
        console.log("Auth info berhasil dihapus");
    }
}

fanStart();
