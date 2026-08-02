const { SlashCommandBuilder } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
} = require("@discordjs/voice");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

const fs = require("fs");

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

        // 2. Edge TTS
        const audioPath = `/tmp/chiste_${Date.now()}.mp3`;

        try {
            const tts = new MsEdgeTTS();
            await tts.setMetadata("es-ES-AlvaroNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            await tts.toFile(audioPath, texto);
        } catch (e) {
            console.error("Edge TTS error:", e);
            return interaction.editReply("❌ Error generando el audio.");
        }

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
        const resource = createAudioResource(audioPath);

        player.play(resource);
        connection.subscribe(player);

        player.on("idle", () => {
            setTimeout(() => connection.destroy(), 500);
            try { fs.unlinkSync(audioPath); } catch {}
        });

        player.on("error", err => {
            console.error("Error reproduciendo:", err.message);
            connection.destroy();
        });

        await interaction.editReply(`🎤 **${texto}**`);
    }
};