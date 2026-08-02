const { SlashCommandBuilder, ChannelType } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chiste")
        .setDescription("El bot se une a tu canal y cuenta un chiste"),

    async execute(interaction) {
        // Comprobar que el usuario está en voz
        const canal = interaction.member?.voice?.channel;
        if (!canal) {
            return interaction.reply({ 
                content: "❌ Únete a un canal de voz primero.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        // 1. Obtener chiste en español
        const res = await fetch("https://v2.jokeapi.dev/joke/Any?lang=es&type=twopart");
        const joke = await res.json();
        const texto = `${joke.setup}... ${joke.delivery}`;

        // 2. Convertir a audio con Google TTS (gratuito, sin API key)
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`;

        // 3. Unirse al canal de voz
        const connection = joinVoiceChannel({
            channelId: canal.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 5000);

        // 4. Reproducir
        const player = createAudioPlayer();
        const resource = createAudioResource(ttsUrl);

        player.play(resource);
        connection.subscribe(player);

        // 5. Desconectar cuando termine
        player.on("idle", () => {
            connection.destroy();
        });

        await interaction.editReply(`🎤 **${texto}**`);
    }
};