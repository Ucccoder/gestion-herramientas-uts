export default async function handler(req, res) {
    // Configuraciones de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            throw new Error("Falta la variable de entorno RESEND_API_KEY en Vercel");
        }

        // Parseo seguro de los datos que envía la página
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { motivoFalla, titulo, ubicacion } = body;

        if (!titulo) {
            throw new Error("Datos incompletos: No se recibió el título de la herramienta");
        }

        const codigoHerramienta = titulo.split(']')[0].replace('🛠️ [', '');
        const nombreHerramienta = titulo.split('] ')[1];

        const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">🚨 Alerta de Mantenimiento</h2>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
                <p><strong>Herramienta:</strong> ${nombreHerramienta}</p>
                <p><strong>Código:</strong> ${codigoHerramienta}</p>
                <p><strong>Ubicación:</strong> ${ubicacion}</p>
                <p style="color: #dc3545;"><strong>Falla Reportada:</strong> ${motivoFalla}</p>
            </div>
        </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Sistema UTS <onboarding@resend.dev>',
                to: 'tecnicouc89@gmail.com', // Recuerda que en el plan gratis de Resend, este correo debe ser el mismo de tu cuenta
                subject: `🚨 Bloqueo: ${nombreHerramienta}`,
                html: htmlTemplate
            })
        });

        const data = await response.json();

        // Si Resend rechaza el correo (ej. por dominio no verificado), forzamos el error
        if (!response.ok) {
            throw new Error(`Error de Resend: ${JSON.stringify(data)}`);
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error("Error interno del servidor:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}