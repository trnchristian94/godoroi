const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType 
} = require("discord.js"); 

module.exports = { 

    data: new SlashCommandBuilder() 
        .setName("move") 
        .setDescription("Mover usuarios de voz") 

        .addChannelOption(o => 
            o.setName("canal_destino") 
                .setDescription("Canal al que mover") 
                .addChannelTypes(ChannelType.GuildVoice) 
                .setRequired(true)) 

        .addUserOption(o => 
            o.setName("usuario") 
                .setDescription("Usuario concreto (opcional)")) 

        .addChannelOption(o => 
            o.setName("canal_origen") 
                .setDescription("Mover todos los de este canal (opcional)") 
                .addChannelTypes(ChannelType.GuildVoice)) 

        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers), 

    async execute(interaction) { 

        await interaction.deferReply(); 

        const destino  = interaction.options.getChannel("canal_destino"); 
        const usuario  = interaction.options.getUser("usuario"); 
        const origen   = interaction.options.getChannel("canal_origen"); 

        // — Mover un usuario concreto —
        if (usuario) { 
            const miembro = await interaction.guild.members.fetch(usuario.id).catch(() => null); 

            if (!miembro) 
                return interaction.editReply("❌ Usuario no encontrado."); 

            if (!miembro.voice.channel) 
                return interaction.editReply("❌ El usuario no está en ningún canal de voz."); 

            if (origen && miembro.voice.channel.id !== origen.id) 
                return interaction.editReply("❌ El usuario no está en ese canal de origen."); 

            await miembro.voice.setChannel(destino); 
            return interaction.editReply(`✅ **${miembro.user.tag}** movido a **${destino.name}**.`); 
        } 

        // — Mover varios (canal origen o todo el servidor) —
        let miembros; 

        if (origen) { 
            // Refrescar la caché del canal para tener los miembros actuales
            const canalOrigen = await interaction.guild.channels.fetch(origen.id); 
            miembros = [...canalOrigen.members.values()]; 
        } else { 
            await interaction.guild.members.fetch(); // refrescar caché
            miembros = interaction.guild.members.cache
                .filter(m => m.voice.channel && m.voice.channel.id !== destino.id) 
                .map(m => m); // Collection → array
        } 

        if (!miembros.length) 
            return interaction.editReply("⚠️ No hay usuarios de voz que mover."); 

        let movidos = 0; 
        let errores = 0; 

        for (const miembro of miembros) { 
            try { 
                await miembro.voice.setChannel(destino); 
                movidos++; 
            } catch { 
                errores++; 
            } 
        } 

        const msg = [`✅ Movidos **${movidos}** usuarios a **${destino.name}**.`]; 
        if (errores) msg.push(`⚠️ ${errores} no pudieron moverse (sin permisos o ya desconectados).`); 

        return interaction.editReply(msg.join("\n")); 
    } 
};