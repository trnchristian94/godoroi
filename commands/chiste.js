const { SlashCommandBuilder } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
} = require("@discordjs/voice");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const Groq = require("groq-sdk");
const fs = require("fs");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CATEGORIAS = {
    "🎲 Cualquiera":         "Any",
    "🎭 Varios":             "Misc",
    "😏 Juegos de palabras": "Pun",
    "👻 Terror":             "Spooky",
    "🎄 Navidad":            "Christmas",
    "💻 Programación":       "Programming",
    "🌑 Humor negro":        "Dark",
    "👨‍👩‍👧 Cuñado":              "Cunado",
};

const PROMPTS = {
    "Any":         "Cuéntame un chiste gracioso y original en español. Que tenga remate claro y sorprendente.",
    "Misc":        "Cuéntame un chiste gracioso y original en español. Que tenga remate claro y sorprendente.",
    "Pun":         "Cuéntame un chiste de juego de palabras en español. Que el remate sea un juego de palabras ingenioso.",
    "Spooky":      "Cuéntame un chiste de terror o de miedo en español. Que sea inquietante pero gracioso.",
    "Christmas":   "Cuéntame un chiste navideño en español. Con referencias a Papá Noel, Reyes Magos, turrón o similares.",
    "Programming": "Cuéntame un chiste de programación o informática en español. Para que lo entiendan programadores.",
    "Dark":        "Cuéntame un chiste de humor negro en español. Sin censura, que sea oscuro de verdad.",
    "Cunado":      "Cuéntame un chiste típico de cuñado español. De esos que suelta el cuñado en las comidas familiares: simples, un poco malos, con remate predecible pero que igual te arranca una sonrisa. Sobre fútbol, política, la crisis, los yernos, etc.",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chiste")
        .setDescription("El bot se une a tu canal y cuenta un chiste")
        .addStringOption(o =>
            o.setName("categoria")
                .setDescription("Tipo de chiste (opcional, por defecto cualquiera)")
                .addChoices(
                    ...Object.entries(CATEGORIAS).map(([name, value]) => ({ name, value }))
                )),

    async execute(interaction) {
        const canal = interaction.member?.voice?.channel;
        if (!canal) {
            return interaction.reply({ 
                content: "❌ Únete a un canal de voz primero.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const categoria = interaction.options.getString("categoria") ?? "Any";

        // 1. Generar chiste con Groq
        let texto;
        try {
            const respuesta = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile", // ← cambia esto
                messages: [
                    { 
                        role: "system", 
                        content: "Eres un comediante español experto en humor. Respondes SOLO con el chiste, sin introducciones, sin explicaciones, sin comillas, sin 'aquí va mi chiste' ni nada parecido. Solo el chiste directamente." 
                    },
                    { role: "user", content: PROMPTS[categoria] }
                ],
                max_tokens: 300
            });
            texto = respuesta.choices[0].message.content.trim();
        } catch (e) {
            console.error("Groq error:", e);
            return interaction.editReply("❌ Error generando el chiste.");
        }

        // 2. Edge TTS
        const audioDir = `/tmp/chiste_${Date.now()}`;
        const audioPath = `${audioDir}/audio.mp3`;
        fs.mkdirSync(audioDir, { recursive: true });

        try {
            const tts = new MsEdgeTTS();
            await tts.setMetadata("es-ES-AlvaroNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            await tts.toFile(audioDir, texto);
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
            try { fs.rmSync(audioDir, { recursive: true }); } catch {}
        });

        player.on("error", err => {
            console.error("Error reproduciendo:", err.message);
            connection.destroy();
        });

        const nombreCategoria = Object.entries(CATEGORIAS).find(([, v]) => v === categoria)?.[0] ?? categoria;
        await interaction.editReply(`🎤 **${texto}**\n\n*Categoría: ${nombreCategoria}*`);
    }
};