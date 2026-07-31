const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});
console.log(process.env.TOKEN ? "Token OK" : "Falta TOKEN");
console.log(process.env.CLIENT_ID);
console.log(process.env.GUILD_ID);
client.once("ready", () => {
    console.log(`Conectado como ${client.user.tag}`);
});

client.login(token);