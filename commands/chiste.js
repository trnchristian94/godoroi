const { 
    SlashCommandBuilder, 
    ChannelType 
} = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
    StreamType
} = require("@discordjs/voice");

// Esto es clave — apunta a ffmpeg-static
process.env.FFMPEG_PATH = require("ffmpeg-static");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chiste")
        .setDescription("El bot se une a tu canal y cuenta un chiste"),

    async execute(interaction) {
        const canal = interaction.member?.voice?.channel;
        if (!canal) {
            return interaction.reply({ 
                content: "❌ Únete a un canal de voz primero.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        // 1. Obtener chiste
        const res = await fetch("https://v2.jokeapi.dev/joke/Any?lang=es&type=twopart");
        const joke = await res.json();
        const texto = `${joke.setup}... ${joke.delivery}`;

        // 2. TTS de Google
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`;

        // 3. Unirse al canal
        const connection = joinVoiceChannel({
            channelId: canal.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);
        } catch {
            connection.destroy();
            return interaction.editReply("❌ No pude unirme al canal.");
        }

        // 4. Reproducir
        const player = createAudioPlayer();
        const resource = createAudioResource(ttsUrl, {
            inputType: StreamType.Arbitrary
        });

        player.play(resource);
        connection.subscribe(player);

        player.on("idle", () => {
            setTimeout(() => connection.destroy(), 1000);
        });

        player.on("error", err => {
            console.error("Error de audio:", err);
            connection.destroy();
        });

        await interaction.editReply(`🎤 **${texto}**`);
    }
};