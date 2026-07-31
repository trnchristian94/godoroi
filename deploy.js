const {
    REST,
    Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const commands = [];

const files = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of files) {

    const command = require(path.join(__dirname, "commands", file));

    commands.push(command.data.toJSON());

}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {

    try {

        console.log("Registrando comandos...");

        await rest.put(

            Routes.applicationGuildCommands(

                process.env.CLIENT_ID,

                process.env.GUILD_ID

            ),

            { body: commands }

        );

        console.log("Comandos registrados.");

    } catch (e) {

        console.error(e);

    }

})();