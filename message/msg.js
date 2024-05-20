/**
 * Created by Irfan Hariyanto
 * Contact me on WhatsApp wa.me/628988808885
 * Follow me on Instagram @irfann._x
 */

"use strict";
const { downloadContentFromMessage } = require("@adiwajshing/baileys");
const { color, bgcolor } = require("../lib/color");

const fs = require("fs");
const moment = require("moment-timezone");
const util = require("util");
const { exec, spawn } = require("child_process");
let setting;
const { OWNER_NUMBER, MAX_TOKEN, AI_MODE } =
    (setting = require("../config.json"));
const speed = require("performance-now");

moment.tz.setDefault("Asia/Jakarta").locale("id");

module.exports = async (
    conn,
    msg,
    m,
    openai,
    serverStatus,
    onServerStatusChanged
) => {
    try {
        if (msg.key.fromMe) return;
        const { type, isQuotedMsg, quotedMsg, mentioned, now, fromMe } = msg;
        const toJSON = (j) => JSON.stringify(j, null, "\t");
        const from = msg.key.remoteJid;
        const chats =
            type === "conversation" && msg.message.conversation
                ? msg.message.conversation
                : type === "imageMessage" && msg.message.imageMessage.caption
                ? msg.message.imageMessage.caption
                : type === "videoMessage" && msg.message.videoMessage.caption
                ? msg.message.videoMessage.caption
                : type === "extendedTextMessage" &&
                  msg.message.extendedTextMessage.text
                ? msg.message.extendedTextMessage.text
                : type === "buttonsResponseMessage" &&
                  quotedMsg.fromMe &&
                  msg.message.buttonsResponseMessage.selectedButtonId
                ? msg.message.buttonsResponseMessage.selectedButtonId
                : type === "templateButtonReplyMessage" &&
                  quotedMsg.fromMe &&
                  msg.message.templateButtonReplyMessage.selectedId
                ? msg.message.templateButtonReplyMessage.selectedId
                : type === "messageContextInfo"
                ? msg.message.buttonsResponseMessage?.selectedButtonId ||
                  msg.message.listResponseMessage?.singleSelectReply
                      .selectedRowId
                : type == "listResponseMessage" &&
                  quotedMsg.fromMe &&
                  msg.message.listResponseMessage.singleSelectReply
                      .selectedRowId
                ? msg.message.listResponseMessage.singleSelectReply
                      .selectedRowId
                : "";

        const args = chats.split(" ");
        const command = chats.toLowerCase().split(" ")[0] || "";
        const isGroup = msg.key.remoteJid.endsWith("@g.us");
        const sender = isGroup
            ? msg.key.participant
                ? msg.key.participant
                : msg.participant
            : msg.key.remoteJid;
        const userId = sender.split("@")[0];
        const isOwner =
            OWNER_NUMBER == sender
                ? true
                : [OWNER_NUMBER].includes(sender)
                ? true
                : false;
        const pushname = msg.pushName;
        const q = chats.slice(command.length + 1, chats.length);
        const botNumber = conn.user.id.split(":")[0] + "@s.whatsapp.net";
        const isCmd = chats.startsWith("/");

        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: msg });
        };

        const tempButton = async (remoteJid, text, footer, content) => {
            // const { displayText, url, contentText, footer } = content
            //send a template message!
            const templateMessage = {
                viewOnceMessage: {
                    message: {
                        templateMessage: {
                            hydratedTemplate: {
                                hydratedContentText: text,
                                hydratedContentFooter: footer,
                                hydratedButtons: content,
                            },
                        },
                    },
                },
            };
            const sendMsg = await conn.relayMessage(
                remoteJid,
                templateMessage,
                {}
            );
        };

        // Auto Read & Presence Online
        conn.readMessages([msg.key]);
        conn.sendPresenceUpdate("available", from);

        // Logs;
        if (!isGroup && isCmd && !fromMe) {
            console.log(
                "->[\x1b[1;32mCMD\x1b[1;37m]",
                color(
                    moment(msg.messageTimestamp * 1000).format(
                        "DD/MM/YYYY HH:mm:ss"
                    ),
                    "yellow"
                ),
                color(`${command} [${args.length}]`),
                "from",
                color(pushname)
            );
        }
        if (isGroup && isCmd && !fromMe) {
            console.log(
                "->[\x1b[1;32mCMD\x1b[1;37m]",
                color(
                    moment(msg.messageTimestamp * 1000).format(
                        "DD/MM/YYYY HH:mm:ss"
                    ),
                    "yellow"
                ),
                color(`${command} [${args.length}]`),
                "from",
                color(pushname),
                "in",
                color(groupName)
            );
        }

        if (serverStatus === true) {
            switch (command) {
                case "/introduce":
                    var textShare = `Hei, aku ada Chat Bot WhatsApp OpenAI nih.
Kirim pertanyaan kamu di bot ini, nanti dijawab sama bot ini.

https://wa.me/${botNumber.split("@")[0]}?text=/start`;
                    var textReply = `Hai 👋

Saya adalah Robot OpenAI yang diciptakan untuk menjawab pertanyaan Anda. Silahkan kirim satu pertanyaan, nanti saya akan menjawabnya.

_AI (Artificial Intelligence) adalah teknologi yang menggunakan algoritma kompleks untuk membuat mesin yang dapat berpikir dan bertindak seperti manusia. AI dapat digunakan untuk menyelesaikan masalah yang rumit dan membuat keputusan yang lebih tepat daripada manusia. AI juga dapat digunakan untuk menganalisis data dan mengambil keputusan berdasarkan data tersebut. AI juga dapat digunakan untuk meningkatkan produktivitas dan efisiensi, serta membantu manusia dalam menyelesaikan tugas-tugas yang rumit._

_bot dibatasi menjawab maximal ${MAX_TOKEN} kata_

*Created By @irfann._x*`;
                    var buttonReply = [
                        {
                            urlButton: {
                                displayText: `Owner 💌`,
                                url: `https://instagram.com/irfann._x`,
                            },
                        },
                        {
                            urlButton: {
                                displayText: `Source Code 🔗`,
                                url: `https://github.com/rtwone/openai-botwa`,
                            },
                        },
                        {
                            urlButton: {
                                displayText: `Share This Bot ❤️`,
                                url:
                                    `https://api.whatsapp.com/send?` +
                                    new URLSearchParams({ text: textShare }),
                            },
                        },
                    ];
                    tempButton(from, textReply, "", buttonReply);
                    break;
                case "/check":
                    reply("WA Bot already started!");
                    break;
                case "/runtime":
                    reply(require("../lib/myfunc").runtime(process.uptime()));
                    break;
                case "/ping":
                    var timestamp = speed();
                    var latensi = speed() - timestamp;
                    reply(`*Pong!!*\nSpeed: ${latensi.toFixed(4)}s`);
                    break;
                case "/wakeup":
                    // nothing
                    break;
                case "/sleep":
                    // nothing
                    break;
                case "=>":
                    if (!isOwner)
                        return reply(
                            `Perintah ini hanya dapat digunakan oleh Owner Bot`
                        );
                    try {
                        let evaled = await eval(q);
                        if (typeof evaled !== "string")
                            evaled = require("util").inspect(evaled);
                        reply(`${evaled}`);
                    } catch (err) {
                        reply(`${err}`);
                    }
                    break;
                default:
                    if (!chats) return;
                    if (
                        !["conversation", "extendedTextMessage"].includes(
                            msg.type
                        )
                    )
                        return reply(`Maaf, aku hanya menerima pesan teks!`);
                    console.log(
                        "->[\x1b[1;32mNew\x1b[1;37m]",
                        color("Question From", "yellow"),
                        color(pushname, "lightblue"),
                        `: "${chats}"`
                    );
                    conn.sendPresenceUpdate("composing", from);
                    try {
                        // const response = await openai.createCompletion({
                        //     model: "text-davinci-003",
                        //     prompt: chats,
                        //     temperature: 0,
                        //     max_tokens: MAX_TOKEN,
                        //     stop: ["Ai:", "Human:"],
                        //     top_p: 1,
                        //     frequency_penalty: 0.2,
                        //     presence_penalty: 0,
                        // });
                        // reply(response.data.choices[0].text.trim());

                        const chatCompletion =
                            await openai.chat.completions.create({
                                model:
                                    AI_MODE === "PAWAN_KRD_REVERSE"
                                        ? "pai-001"
                                        : "gpt-3.5-turbo", // use this when under reversed proxy by Pawan.Krd
                                messages: [{ role: "user", content: chats }],
                            });

                        reply(chatCompletion.choices[0].message.content);
                    } catch (e) {
                        console.log("error occured: ", e);
                        reply("Server Error, AI Not Responding...");
                    }
                    break;
            }
        }

        // switch chat listening status
        switch (command) {
            case "/wakeup":
                if (isOwner) {
                    if (serverStatus === false) {
                        onServerStatusChanged(true);
                        reply("Bot WA aktif");
                    } else {
                        reply("Bot WA sudah aktif");
                    }
                }
                break;
            case "/sleep":
                if (isOwner) {
                    if (serverStatus === true) {
                        onServerStatusChanged(false);
                        reply("Bot WA tidur");
                    } else {
                        reply("Bot WA sudah tidur");
                    }
                }
                break;
        }
    } catch (err) {
        console.log(color("[ERROR]", "red"), err);
    }
};
