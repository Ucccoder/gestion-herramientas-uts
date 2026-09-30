export default async function handler(req, res) {
    // Configuraciones para evitar el error de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }


    const { motivoFalla, titulo, ubicacion } = req.body;
    const codigoHerramienta = titulo.split(']')[0].replace('🛠️ [', '');
    const nombreHerramienta = titulo.split('] ')[1];

    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">🚨 Alerta Crítica de Mantenimiento</h2>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333;">Una herramienta ha reprobado el Checklist Pre-Uso en el Taller VRC y ha sido <strong>bloqueada preventivamente</strong> en el sistema.</p>
            <div style="background-color: white; padding: 15px; border-radius: 8px; border-left: 5px solid #dc3545; margin-top: 20px;">
                <p style="margin: 8px 0; font-size: 15px;"><strong>🛠️ Herramienta:</strong> ${nombreHerramienta}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>🏷️ Código Interno:</strong> ${codigoHerramienta}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>📍 Ubicación:</strong> ${ubicacion}</p>
                <p style="margin: 8px 0; font-size: 15px; color: #dc3545;"><strong>⚠️ Falla Reportada:</strong> ${motivoFalla}</p>
            </div>
            <p style="margin-top: 25px; font-size: 14px; color: #666; text-align: center;">Por favor, ingrese a la plataforma UTS para habilitarla tras realizar la inspección.</p>
        </div>
    </div>
    `;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Sistema UTS <onboarding@resend.dev>',
                to: 'tecnicouc89@gmail.com',
                subject: `🚨 Bloqueo Urgente: ${nombreHerramienta} (${codigoHerramienta})`,
                html: htmlTemplate
            })
        });

        const data = await response.json();
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}