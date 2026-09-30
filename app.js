const SUPABASE_URL = 'https://yofcdgqkfgozcyvbyqvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZmNkZ3FrZmdvemN5dmJ5cXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODUwMDcsImV4cCI6MjEwNTc2MTAwN30.aV8XcuzTZTJBf68qG9nkee5xz4WREgdvbdLYHSCxJJQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const idHerramienta = urlParams.get('id');
let inventarioCompleto = [];

// ==========================================
// MODO ADMINISTRADOR (PIN: 1234)
// ==========================================
let isAdmin = false;
function toggleAdmin() {
    if (!isAdmin) {
        let pin = prompt("Por favor, ingrese el PIN de Administrador (Prueba: 1234):");
        if (pin === "1234") {
            isAdmin = true;
            document.getElementById('btn-add-tool').style.display = 'block';
            document.getElementById('btn-admin-toggle').classList.add('active');
            document.getElementById('btn-admin-toggle').innerText = '🔓 Modo Admin Activo';
            alert("✅ Modo Administrador Activado");
        } else if (pin !== null) {
            alert("❌ PIN Incorrecto");
        }
    } else {
        isAdmin = false;
        document.getElementById('btn-add-tool').style.display = 'none';
        document.getElementById('btn-admin-toggle').classList.remove('active');
        document.getElementById('btn-admin-toggle').innerText = '🔒 Modo Admin';
        alert("🔒 Modo Administrador Desactivado");
    }
}

// ==========================================
// VISTA 1: HOME Y DASHBOARD
// ==========================================
async function cargarInventarioHome() {
    try {
        const { data, error } = await supabaseClient.from('herramientas').select('*').order('id', { ascending: true });
        if (error) throw error;
        inventarioCompleto = data;
        renderizarTarjetasHome(inventarioCompleto);
        actualizarMetricasDashboard(inventarioCompleto);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('home-view').style.display = 'block';
    } catch (err) {
        document.getElementById('loading').innerHTML = `<div class="alert-box">Error de conexión con la base de datos.</div>`;
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
    if (lista.length === 0) return contenedor.innerHTML = `<p style="text-align:center; width:100%;">No se encontraron resultados.</p>`;

    lista.forEach(item => {
        let badgeClass = item.estado === 'Verde' ? 'bg-verde' : (item.estado === 'Amarillo' ? 'bg-amarillo' : 'bg-rojo');
        let badgeText = item.estado === 'Verde' ? 'Apta' : (item.estado === 'Amarillo' ? 'Revisión' : 'Bloqueada');
        
        let imgUrl = item.url_imagen ? item.url_imagen : 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=500&q=80';

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
                        <button class="btn btn-primary" style="padding: 10px; margin:0;">Ver Ficha</button>
                    </div>
                </div>
            </div>`;
        contenedor.appendChild(col);
    });
}

document.getElementById('search-input')?.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    renderizarTarjetasHome(inventarioCompleto.filter(h => h.nombre.toLowerCase().includes(busqueda) || (h.codigo_interno && h.codigo_interno.toLowerCase().includes(busqueda))));
});

function filtrarHerramientas(estado) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderizarTarjetasHome(estado === 'Todas' ? inventarioCompleto : inventarioCompleto.filter(h => h.estado === estado));
}

// ==========================================
// CONTROL DE MODALES Y CREACIÓN
// ==========================================
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function cerrarModal(id) { document.getElementById(id).style.display = 'none'; }

async function guardarNuevaHerramienta() {
    const nombre = document.getElementById('new-nombre').value;
    if (!nombre) return;
    try {
        await supabaseClient.from('herramientas').insert([{
            nombre: nombre, 
            codigo_interno: document.getElementById('new-codigo').value, 
            marca: document.getElementById('new-marca').value, 
            modelo: document.getElementById('new-modelo').value, 
            ubicacion: document.getElementById('new-ubicacion').value, 
            estado: 'Verde', 
            observaciones: '', 
            criticidad: 'No Evaluada',
            url_imagen: '',
            url_video: ''
        }]);
        cerrarModal('modal-nueva');
        cargarInventarioHome(); 
    } catch (err) { console.error("Error guardando herramienta", err); }
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

        // Lógica de Criticidad
        const critBadge = document.getElementById('tool-crit');
        critBadge.innerText = data.criticidad || 'No Evaluada';
        critBadge.className = 'crit-badge ' + (data.criticidad === 'Alta' ? 'crit-alta' : (data.criticidad === 'Media' ? 'crit-media' : (data.criticidad === 'Baja' ? 'crit-baja' : 'crit-none')));

        // Lógica de Observaciones
        const obsBox = document.getElementById('obs-text');
        if (data.estado === 'Rojo' && data.observaciones) {
            obsBox.innerText = `⚠️ Motivo de bloqueo: ${data.observaciones}`;
            obsBox.style.display = 'block';
        } else {
            obsBox.style.display = 'none';
        }

        actualizarSemaforo(data.estado);

        // Lógica Botones
        const btnPdf = document.getElementById('btn-pdf');
        if (data.url_pdf) { btnPdf.style.display = 'block'; btnPdf.onclick = () => window.open(data.url_pdf, '_blank'); } 
        else { btnPdf.style.display = 'none'; }

        const btnVideo = document.getElementById('btn-video');
        if (data.url_video) { btnVideo.style.display = 'block'; btnVideo.onclick = () => window.open(data.url_video, '_blank'); } 
        else { btnVideo.style.display = 'none'; }

        document.getElementById('loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    } catch (err) { document.getElementById('loading').innerHTML = `<div class="alert-box">❌ Error: Herramienta no encontrada.</div>`; }
}

function actualizarSemaforo(estado) {
    const badge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    badge.className = 'status-badge'; 
    if (estado === 'Verde') { badge.classList.add('bg-verde'); statusText.innerText = 'Herramienta Apta y Operativa'; } 
    else if (estado === 'Amarillo') { badge.classList.add('bg-amarillo'); statusText.innerText = 'Próxima a Mantenimiento'; } 
    else { badge.classList.add('bg-rojo'); statusText.innerText = 'FUERA DE SERVICIO / BLOQUEADA'; }
}

async function cambiarEstadoBD(nuevoEstado, observacion = '') {
    if (!idHerramienta) return;
    try {
        await supabaseClient.from('herramientas').update({ estado: nuevoEstado, observaciones: observacion }).eq('id', idHerramienta);
        cargarDatosHerramienta(idHerramienta); 
    } catch (err) { console.error("Error BD", err); }
}

// ==========================================
// RESEND: ENVÍO DE CORREOS
// ==========================================
async function enviarCorreoMantenimiento(motivoFalla) {
    const titulo = document.getElementById('tool-title').innerText; 
    const ubicacion = document.getElementById('tool-location').innerText;

    try {
        await fetch('/api/correo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                motivoFalla: motivoFalla,
                titulo: titulo,
                ubicacion: ubicacion
            })
        });
        console.log("Correo enviado al mini-servidor exitosamente.");
    } catch (error) {
        console.error("Error enviando correo:", error);
    }
}

// ==========================================
// CÁLCULO DE CRITICIDAD
// ==========================================
async function calcularCriticidad() {
    const seg = parseInt(document.getElementById('crit-seguridad').value);
    const prod = parseInt(document.getElementById('crit-produccion').value);
    const uso = parseInt(document.getElementById('crit-uso').value);
    
    const puntajeTotal = seg + prod + uso;
    let resultado = 'Baja';
    
    if (puntajeTotal >= 8) resultado = 'Alta';
    else if (puntajeTotal >= 5) resultado = 'Media';

    try {
        await supabaseClient.from('herramientas').update({ criticidad: resultado }).eq('id', idHerramienta);
        cerrarModal('modal-matriz');
        cargarDatosHerramienta(idHerramienta);
    } catch (error) { console.error("Error guardando criticidad:", error); }
}

// ==========================================
// FECHAS Y CHECKLIST PREVENTIVO
// ==========================================
function prepararModalFechas() {
    const lastDate = document.getElementById('maint-last').innerText;
    const nextDate = document.getElementById('maint-next').innerText;
    if (lastDate !== 'N/A') document.getElementById('edit-last').value = lastDate;
    if (nextDate !== 'N/A') document.getElementById('edit-next').value = nextDate;
    abrirModal('modal-fechas');
}

async function guardarFechas() {
    const ult = document.getElementById('edit-last').value;
    const prox = document.getElementById('edit-next').value;
    if (ult && prox) {
        await supabaseClient.from('herramientas').update({ ultimo_preventivo: ult, proximo_preventivo: prox }).eq('id', idHerramienta);
        cerrarModal('modal-fechas');
        cargarDatosHerramienta(idHerramienta);
    }
}

const checkboxes = document.querySelectorAll('.critical-check');
const alertBox = document.getElementById('checklist-alert');
const actionArea = document.getElementById('checklist-action-area');

checkboxes.forEach(chk => {
    chk.addEventListener('change', function() {
        this.closest('.check-item').classList.toggle('item-danger', this.checked);
        if (document.querySelectorAll('.critical-check:checked').length > 0) {
            alertBox.style.display = 'block'; actionArea.style.display = 'block'; actualizarSemaforo('Rojo'); 
        } else {
            alertBox.style.display = 'none'; actionArea.style.display = 'none'; cargarDatosHerramienta(idHerramienta); 
        }
    });
});

document.getElementById('btn-confirm-inline').addEventListener('click', async () => {
    let motivo = document.getElementById('inline-motivo').value || 'Bloqueo preventivo por checklist';
    actionArea.style.display = 'none';
    await cambiarEstadoBD('Rojo', motivo);
    enviarCorreoMantenimiento(motivo);
    alert("Bloqueo registrado y correo de alerta enviado a mantenimiento.");
});

document.getElementById('btn-cancel-inline').addEventListener('click', () => {
    document.querySelectorAll('.critical-check').forEach(chk => { chk.checked = false; chk.closest('.check-item').classList.remove('item-danger'); });
    alertBox.style.display = 'none'; actionArea.style.display = 'none';
    document.getElementById('inline-motivo').value = '';
    cargarDatosHerramienta(idHerramienta);
});

async function procesarFallaManual() {
    let motivo = document.getElementById('falla-motivo').value || 'Falla crítica reportada por operario';
    cerrarModal('modal-falla');
    await cambiarEstadoBD('Rojo', motivo);
    enviarCorreoMantenimiento(motivo);
    alert("Herramienta bloqueada y correo enviado a mantenimiento.");
    document.getElementById('falla-motivo').value = '';
}

// Controles de Supervisor
document.getElementById('btn-amarillo')?.addEventListener('click', () => {
    if (confirm("¿Pasar herramienta a Revisión?")) cambiarEstadoBD('Amarillo', '');
});

document.getElementById('btn-verde')?.addEventListener('click', () => {
    if (confirm("¿Confirmas que la herramienta fue reparada y es segura?")) {
        document.querySelectorAll('.critical-check').forEach(chk => { chk.checked = false; chk.closest('.check-item').classList.remove('item-danger'); });
        alertBox.style.display = 'none';
        cambiarEstadoBD('Verde', ''); 
    }
});

document.getElementById('btn-back')?.addEventListener('click', () => window.location.href = 'index.html');

// Inicializador
if (idHerramienta) cargarDatosHerramienta(idHerramienta); else cargarInventarioHome();