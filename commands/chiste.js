const { 
    SlashCommandBuilder
} = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const { execSync } = require("child_process");

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

        // 2. Descargar TTS con curl simulando navegador
        const audioPath = `/tmp/chiste_${Date.now()}.mp3`;
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`;

        try {
            execSync(`curl -s -A "Mozilla/5.0" -o "${audioPath}" "${ttsUrl}"`);
        } catch (e) {
            console.error("Error descargando TTS:", e);
            return interaction.editReply("❌ No pude generar el audio.");
        }

        // Comprobar que el archivo tiene contenido
        const stat = fs.statSync(audioPath);
        if (stat.size < 1000) {
            return interaction.editReply("❌ Google TTS bloqueó la petición.");
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

        // 4. Reproducir archivo local
        const player = createAudioPlayer();
        const resource = createAudioResource(audioPath);

        player.play(resource);
        connection.subscribe(player);

        player.on("idle", () => {
            setTimeout(() => connection.destroy(), 500);
            fs.unlinkSync(audioPath); // limpiar archivo
        });

        player.on("error", err => {
            console.error("Error reproduciendo:", err.message);
            connection.destroy();
        });

        await interaction.editReply(`🎤 **${texto}**`);
    }
};