const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("move")

        .setDescription("Mover usuarios")

        .addStringOption(o =>
            o.setName("usuario")
                .setDescription("Usuario o all")
                .setRequired(true))

        .addChannelOption(o =>
            o.setName("canal_destino")
                .setDescription("Destino")
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))

        .addChannelOption(o =>
            o.setName("canal_origen")
                .setDescription("Origen")
                .addChannelTypes(ChannelType.GuildVoice))

        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {

        const usuario = interaction.options.getString("usuario");

        const destino = interaction.options.getChannel("canal_destino");

        const origen = interaction.options.getChannel("canal_origen");

        if (usuario === "all") {

            const miembros = origen
                ? [...origen.members.values()]
                : interaction.guild.members.cache.filter(m => m.voice.channel);

            let n = 0;

            for (const miembro of miembros) {

                try {

                    await miembro.voice.setChannel(destino);

                    n++;

                } catch {}

            }

            return interaction.reply(`Movidos ${n} usuarios.`);

        }

        const id = usuario.replace(/[<@!>]/g, "");

        const miembro = await interaction.guild.members.fetch(id).catch(() => null);

        if (!miembro)
            return interaction.reply({
                content: "Usuario no encontrado.",
                ephemeral: true
            });

        if (!miembro.voice.channel)
            return interaction.reply({
                content: "No está en voz.",
                ephemeral: true
            });

        if (origen && miembro.voice.channel.id !== origen.id)
            return interaction.reply({
                content: "No está en ese canal.",
                ephemeral: true
            });

        await miembro.voice.setChannel(destino);

        interaction.reply(`Movido ${miembro.user.tag}`);

    }

};