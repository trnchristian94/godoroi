const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, c => {
    console.log(`Conectado como ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);

        if (interaction.replied)
            interaction.followUp({
                content: "Error.",
                ephemeral: true
            });
        else
            interaction.reply({
                content: "Error.",
                ephemeral: true
            });
    }

});

// Registrar comandos al arrancar
const { REST, Routes } = require("discord.js");
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
const cmds = [...client.commands.values()].map(c => c.data.toJSON());

rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: cmds }
).then(() => console.log("✅ Comandos registrados."));

client.login(process.env.TOKEN);

client.login(process.env.TOKEN);