// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================
const SUPABASE_URL = 'https://yofcdgqkfgozcyvbyqvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZmNkZ3FrZmdvemN5dmJ5cXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODUwMDcsImV4cCI6MjEwNTc2MTAwN30.aV8XcuzTZTJBf68qG9nkee5xz4WREgdvbdLYHSCxJJQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const idHerramienta = urlParams.get('id');

let inventarioCompleto = [];

// ==========================================
// VISTA 1: HOME (TARJETAS GIRATORIAS Y DASHBOARD)
// ==========================================
async function cargarInventarioHome() {
    try {
        const { data, error } = await supabaseClient
            .from('herramientas')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        inventarioCompleto = data;
        renderizarTarjetasHome(inventarioCompleto);
        actualizarMetricasDashboard(inventarioCompleto);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('home-view').style.display = 'block';
    } catch (err) {
        console.error("Error al cargar inventario:", err);
        document.getElementById('loading').innerHTML = `<div class="alert-box">Error de conexión.</div>`;
    }
}

function actualizarMetricasDashboard(lista) {
    document.getElementById('stat-total').innerText = lista.length;
    document.getElementById('stat-aptas').innerText = lista.filter(h => h.estado === 'Verde').length;
    document.getElementById('stat-revision').innerText = lista.filter(h => h.estado === 'Amarillo').length;
    document.getElementById('stat-bloqueadas').innerText = lista.filter(h => h.estado === 'Rojo').length;
}

function renderizarTarjetasHome(lista) {
    const contenedor = document.getElementById('tools-list');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = `<p style="text-align:center; color:#777; width:100%;">No se encontraron resultados.</p>`;
        return;
    }

    lista.forEach(item => {
        let badgeClass = item.estado === 'Verde' ? 'bg-verde' : (item.estado === 'Amarillo' ? 'bg-amarillo' : 'bg-rojo');
        let badgeText = item.estado === 'Verde' ? 'Apta' : (item.estado === 'Amarillo' ? 'Revisión' : 'Bloqueada');
        
        // Imagen placeholder temporal (la cambiarás después)
        let imgUrl = 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=500&q=80';

        const col = document.createElement('div');
        col.className = 'col';
        col.setAttribute('ontouchstart', "this.classList.toggle('hover');");

        col.innerHTML = `
            <div class="container" onclick="window.location.href='index.html?id=${item.id}'">
                <div class="front" style="background-image: url('${imgUrl}')">
                    <div class="inner">
                        <p>${item.nombre}</p>
                        <span class="mini-badge ${badgeClass}" style="color: #000;">${badgeText}</span>
                    </div>
                </div>
                <div class="back">
                    <div class="inner">
                        <p>Cód: ${item.codigo_interno || item.id}</p>
                        <span style="font-size: 0.9rem; color: #ccc;">Ubicación: ${item.ubicacion || 'Taller'}</span><br><br>
                        <button class="btn btn-primary" style="padding: 10px; margin:0;">Escanear / Ver Ficha</button>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(col);
    });
}

document.getElementById('search-input')?.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtradas = inventarioCompleto.filter(h => 
        h.nombre.toLowerCase().includes(busqueda) || 
        (h.codigo_interno && h.codigo_interno.toLowerCase().includes(busqueda))
    );
    renderizarTarjetasHome(filtradas);
});

function filtrarHerramientas(estado) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (estado === 'Todas') {
        renderizarTarjetasHome(inventarioCompleto);
    } else {
        const filtradas = inventarioCompleto.filter(h => h.estado === estado);
        renderizarTarjetasHome(filtradas);
    }
}

// ==========================================
// VISTA 2: FICHA TÉCNICA DETALLADA
// ==========================================
async function cargarDatosHerramienta(id) {
    try {
        const { data, error } = await supabaseClient.from('herramientas').select('*').eq('id', id).single();
        if (error) throw error;

        document.getElementById('tool-title').innerText = `🛠️ [${data.codigo_interno || id}] ${data.nombre}`;
        document.getElementById('tool-brand').innerText = data.marca || 'N/A';
        document.getElementById('tool-model').innerText = data.modelo || 'N/A';
        document.getElementById('tool-location').innerText = data.ubicacion || 'N/A';
        document.getElementById('maint-last').innerText = data.ultimo_preventivo || 'N/A';
        document.getElementById('maint-next').innerText = data.proximo_preventivo || 'N/A';

        actualizarSemaforo(data.estado);

        const btnPdf = document.getElementById('btn-pdf');
        if (data.url_pdf) {
            btnPdf.style.display = 'block';
            btnPdf.onclick = () => window.open(data.url_pdf, '_blank');
        } else {
            btnPdf.style.display = 'none';
        }

        document.getElementById('loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';

    } catch (err) {
        console.error(err);
        document.getElementById('loading').innerHTML = `<div class="alert-box">❌ Error: Herramienta no encontrada.</div>`;
    }
}

function actualizarSemaforo(estado) {
    const badge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    badge.className = 'status-badge'; 

    if (estado === 'Verde') {
        badge.classList.add('bg-verde');
        statusText.innerText = 'Herramienta Apta y Operativa';
    } else if (estado === 'Amarillo') {
        badge.classList.add('bg-amarillo');
        statusText.innerText = 'Próxima a Mantenimiento';
    } else {
        badge.classList.add('bg-rojo');
        statusText.innerText = 'FUERA DE SERVICIO / BLOQUEADA';
    }
}

// ==========================================
// VISTA 3: BD SILENCIOSA Y CHECKLIST
// ==========================================
async function cambiarEstadoBD(nuevoEstado) {
    if (!idHerramienta) return;
    try {
        // Ejecución silenciosa sin alert() molesto
        await supabaseClient.from('herramientas').update({ estado: nuevoEstado }).eq('id', idHerramienta);
        actualizarSemaforo(nuevoEstado);
    } catch (err) {
        console.error("Error BD:", err);
        alert("Error de conexión. No se pudo guardar el estado."); // Este sí importa porque es un error
    }
}

const checkboxes = document.querySelectorAll('.critical-check');
const alertBox = document.getElementById('checklist-alert');

checkboxes.forEach(chk => {
    chk.addEventListener('change', function() {
        const parentLabel = this.closest('.check-item');
        if (this.checked) parentLabel.classList.add('item-danger');
        else parentLabel.classList.remove('item-danger');

        const fallas = document.querySelectorAll('.critical-check:checked').length;
        if (fallas > 0) {
            alertBox.style.display = 'block';
            actualizarSemaforo('Rojo'); 
            
            setTimeout(() => { 
                if (confirm("⚠️ Detectaste una falla de seguridad. ¿BLOQUEAR esta herramienta en el sistema?")) {
                    cambiarEstadoBD('Rojo'); // Sin alerta extra, solo el confirm nativo
                } else {
                    this.checked = false;
                    parentLabel.classList.remove('item-danger');
                    if (document.querySelectorAll('.critical-check:checked').length === 0) {
                        alertBox.style.display = 'none';
                        cargarDatosHerramienta(idHerramienta);
                    }
                }
            }, 100);
        } else {
            alertBox.style.display = 'none';
            cargarDatosHerramienta(idHerramienta);
        }
    });
});

document.getElementById('btn-report')?.addEventListener('click', () => {
    if (confirm("¿Registrar falla crítica? La herramienta quedará bloqueada.")) cambiarEstadoBD('Rojo');
});

document.getElementById('btn-amarillo')?.addEventListener('click', () => {
    if (confirm("¿Pasar herramienta a Mantenimiento/Revisión?")) cambiarEstadoBD('Amarillo');
});

document.getElementById('btn-verde')?.addEventListener('click', () => {
    if (confirm("¿Confirmas que la herramienta fue reparada y es segura?")) {
        document.querySelectorAll('.critical-check').forEach(chk => {
            chk.checked = false; chk.closest('.check-item').classList.remove('item-danger');
        });
        document.getElementById('checklist-alert').style.display = 'none';
        cambiarEstadoBD('Verde');
    }
});

document.getElementById('btn-back')?.addEventListener('click', () => window.location.href = 'index.html');

if (idHerramienta) cargarDatosHerramienta(idHerramienta);
else cargarInventarioHome();