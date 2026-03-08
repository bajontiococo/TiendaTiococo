// =========================================================================
// CONFIGURACIÓN TIOCOCO
// =========================================================================
const WHATSAPP_NUM = "56936416743"; // Tu número de WhatsApp

function escapeHTML(str) {
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// ⚠️ PEGA AQUÍ LOS DATOS DE TU NUEVA CUENTA DE SUPABASE ⚠️
const supabaseUrl = 'TU_NUEVA_URL_DE_SUPABASE_AQUI';
const supabaseKey = 'TU_NUEVA_CLAVE_ANON_AQUI';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

//solo la region Rm posible expanción a futuro.
const regionesYComunas = {
    "Metropolitana": ["Santiago", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo", "Colina", "Lampa", "Tiltil", "San Bernardo", "Buin", "Calera de Tango", "Paine", "Melipilla", "Alhué", "Curacaví", "María Pinto", "San Pedro", "Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor"],

};

const comunasRM = {
    centricas: ["Santiago", "Providencia", "Las Condes", "Ñuñoa", "La Reina", "Vitacura", "Lo Barnechea", "Macul", "San Joaquín", "Pedro Aguirre Cerda", "San Miguel", "Estación Central", "Quinta Normal", "Recoleta", "Independencia", "Conchalí", "Renca", "Cerro Navia", "Lo Prado", "Pudahuel", "Cerrillos", "Maipú", "La Florida", "Peñalolén", "La Granja", "La Cisterna", "El Bosque", "San Ramón", "La Pintana", "Puente Alto", "San Bernardo"],
    perifericas: ["Colina", "Lampa", "Tiltil", "Pirque", "San José de Maipo", "Buin", "Calera de Tango", "Paine", "Melipilla", "Alhué", "Curacaví", "María Pinto", "San Pedro", "Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor"]
};

let db = []; 
let adminDb = []; 
let cart = JSON.parse(localStorage.getItem('tiococo_cart')) || [];
let currentPage = 1;
const itemsPerPage = 20;
let totalProductos = 0; 
let busquedaActual = '';
let lastSearch = '';

let hasOpenedCartAutomatically = false; 
let searchTimeout; 
let costoEnvio = 3500; 
let totalPagarFinal = 0;

let currentUser = null;
let userProfile = null;
let productoEnEdicion = null;

let filtroAdminTexto = '';

const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' text-anchor='middle' dy='.3em' fill='%23999'%3ESin Foto%3C/text%3E%3C/svg%3E";

window.addEventListener('popstate', function(event) {
    const modal = document.getElementById('product-modal');
    const authModal = document.getElementById('auth-modal');
    const cartSidebar = document.getElementById('cart-sidebar');
    const leftSidebar = document.getElementById('left-sidebar');
    const adminModal = document.getElementById('admin-modal');
    const stickyBar = document.getElementById('mobile-sticky-bar');

    if (modal && !modal.classList.contains('hidden')) { modal.classList.add('hidden'); document.body.classList.remove('locked'); }
    if (authModal && !authModal.classList.contains('hidden')) { closeAuthModal(); }
    if (adminModal && !adminModal.classList.contains('hidden')) { closeAdminModal(); }
    if (cartSidebar && cartSidebar.classList.contains('translate-x-0')) { forceCloseCart(); }
    if (leftSidebar && !leftSidebar.classList.contains('-translate-x-full')) {
        leftSidebar.classList.add('-translate-x-full');
        document.getElementById('menu-overlay').classList.remove('open');
        document.body.classList.remove('locked');
        if(cart.length > 0 && window.innerWidth < 1024) stickyBar.classList.remove('translate-y-full');
    }
});

window.addEventListener('DOMContentLoaded', () => { 
    verificarSesion();
    cargarProductosPagina(1); 
    updateCartUI();
    initSwipeGestures();
    cargarSelectoresRegion(); 
});

function cargarSelectoresRegion() {
    const selectReg = document.getElementById('reg-region');
    const selectEdit = document.getElementById('edit-region');
    
    let opciones = '<option value="">Seleccione Región...</option>';
    for (let region in regionesYComunas) {
        opciones += `<option value="${region}">${region}</option>`;
    }
    
    if(selectReg) selectReg.innerHTML = opciones;
    if(selectEdit) selectEdit.innerHTML = opciones;
}

function actualizarComunas(prefijo) {
    const selectRegion = document.getElementById(`${prefijo}-region`);
    const selectComuna = document.getElementById(`${prefijo}-comuna`);
    const regionElegida = selectRegion.value;

    if (regionElegida && regionesYComunas[regionElegida]) {
        let opciones = '<option value="">Seleccione Comuna...</option>';
        regionesYComunas[regionElegida].forEach(comuna => {
            opciones += `<option value="${comuna}">${comuna}</option>`;
        });
        selectComuna.innerHTML = opciones;
        selectComuna.disabled = false;
    } else {
        selectComuna.innerHTML = '<option value="">Primero seleccione Región</option>';
        selectComuna.disabled = true;
    }
    actualizarOpcionEnvioSegunDireccion();
}

async function cargarProductosPagina(page) {
    const loadingMsg = document.getElementById('loading-msg');
    const seccionCatalogo = document.getElementById('seccion-catalogo');
    
    if (loadingMsg) loadingMsg.classList.remove('hidden');
    if (seccionCatalogo) seccionCatalogo.classList.add('hidden');

    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    try {
        let query = supabaseClient.from('productos').select('*', { count: 'exact' });

        if (busquedaActual.length > 0) {
            query = query.or(`producto.ilike.%${busquedaActual}%,numero_producto.ilike.%${busquedaActual}%`);
            query = query.order('id', { ascending: false });
        } else {
            query = query.order('destacado', { ascending: false }); 
        }

        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        totalProductos = count || 0;

        // Simplificación: Asignamos valores por defecto a lo que ya no está en la base de datos
        db = data.map(p => ({
            id: p.id,
            sku: p.numero_producto || 'S/N',
            nombre: p.producto,
            desc: p.descripcion || 'Sin descripción',
            precio: Number(p.precio) || 0,
            destacado: p.destacado || 0,
            cat: 'General', 
            img: PLACEHOLDER_SVG,
            disponible: true, 
            stock: 9999 
        }));

        renderGrid(db, page);
        renderPaginationControls(page); 
        renderDestacados(db);

        if (loadingMsg) loadingMsg.classList.add('hidden');
        if (seccionCatalogo) seccionCatalogo.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        mostrarToast("Error cargando productos", "error");
    }
}

function renderGrid(lista, page) {
    const contenedor = document.getElementById('grid-productos');
    const cantidad = document.getElementById('cantidad-productos');
    if(!contenedor) return;
    if(cantidad) cantidad.innerText = totalProductos; 
    
    if(lista.length === 0) { 
        contenedor.innerHTML = `<div class="col-span-full py-10 text-center text-gray-500 bg-white/80 rounded-xl p-6"><p>No se encontraron productos.</p></div>`; 
        const pagination = document.getElementById('pagination-controls');
        if(pagination) pagination.classList.add('hidden');
        return; 
    }
    
    contenedor.innerHTML = lista.map(p => cardHTML(p)).join(''); 
}

function renderPaginationControls(page) {
    const controls = document.getElementById('pagination-controls');
    if(!controls) return;
    const totalPages = Math.ceil(totalProductos / itemsPerPage);
    if (totalPages <= 1) { 
        controls.classList.add('hidden'); 
        return; 
    }
    controls.classList.remove('hidden');
    document.getElementById('page-indicator').innerText = `Pág ${page} de ${totalPages}`;
    document.getElementById('btn-prev').disabled = page === 1;
    document.getElementById('btn-next').disabled = page === totalPages;
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= Math.ceil(totalProductos / itemsPerPage)) {
        currentPage = newPage;
        cargarProductosPagina(currentPage);
        const catalogo = document.getElementById('seccion-catalogo');
        if (catalogo) {
            window.scrollTo({
                top: catalogo.getBoundingClientRect().top + window.pageYOffset - 120, 
                behavior: 'smooth'
            });
        }
    }
}

function resetAndScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    busquedaActual = '';
    currentPage = 1;

    const tituloGrid = document.getElementById('titulo-grid');
    if(tituloGrid) tituloGrid.innerText = 'Catálogo';
    
    const searchDesktop = document.getElementById('search-desktop');
    const searchMobile = document.getElementById('search-mobile');
    if(searchDesktop) searchDesktop.value = '';
    if(searchMobile) searchMobile.value = '';
    
    cargarProductosPagina(1);
    mostrarToast("Volviendo al inicio", "info");
}

function buscar(query) {
    if (query === lastSearch) return;
    lastSearch = query;
    clearTimeout(searchTimeout); 
    
    searchTimeout = setTimeout(() => {
        busquedaActual = query.toLowerCase();
        currentPage = 1;
        
        const tituloGrid = document.getElementById('titulo-grid');
        if (busquedaActual.length > 0) {
            if(tituloGrid) tituloGrid.innerText = `Resultados para "${query}"`;
        } else {
            if(tituloGrid) tituloGrid.innerText = 'Catálogo';
        }
        
        cargarProductosPagina(1);
    }, 500);
}

function renderDestacados(lista) {
    const destacados = lista.filter(p => p.destacado === 1).slice(0, 6); 
    const container = document.getElementById('hero-destacados-container');
    const section = document.getElementById('hero-section');
    if(!container || !section) return;
    
    if (destacados.length === 0) {
        section.classList.add('hidden'); 
        return;
    }
    section.classList.remove('hidden'); 
    container.innerHTML = destacados.map(p => `
        <div class="slider-card bg-white rounded-2xl border border-gray-200 overflow-hidden relative h-full flex flex-col shadow-sm cursor-pointer hover:shadow-md transition-all" onclick="openProduct(${p.id})">
            <div class="relative h-48 md:h-56 bg-gray-100 p-2 flex items-center justify-center">
                <i class="fa fa-hamburger text-6xl text-gray-300"></i>
                <div class="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm">Destacado</div>
            </div>
            <div class="p-3 flex flex-col flex-1">
                <h3 class="font-bold text-gray-800 text-xs md:text-sm mb-1 line-clamp-2">${escapeHTML(p.nombre)}</h3>
                <span class="text-sm md:text-lg font-black text-gray-900 mt-auto">$${p.precio.toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}

// --- SISTEMA DE USUARIOS Y PERFILES ---
async function verificarSesion() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error || !user) {
        await supabaseClient.auth.signOut();
        currentUser = null;
        userProfile = null;
    } else {
        currentUser = user;
        await cargarPerfil(currentUser.id);
    }
    actualizarBotonesUsuario();
    
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            if (!currentUser || currentUser.id !== session.user.id) {
                currentUser = session.user;
                await cargarPerfil(currentUser.id);
                await sincronizarCarritoConBD();
            }
        } else {
            currentUser = null;
            userProfile = null;
            cart = [];
            localStorage.removeItem('tiococo_cart');
            updateCartUI();
        }
        actualizarBotonesUsuario();
    });
}

async function cargarPerfil(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
    
    if (!error && data) { 
        userProfile = data; 
        userProfile.esAdmin = (data.rol === 'admin');
        actualizarOpcionEnvioSegunDireccion();
    } else {
        userProfile = null;
    }
    return userProfile;
}

function actualizarBotonesUsuario() {
    const icon = document.getElementById('user-icon');
    const mobileTxt = document.getElementById('mobile-menu-user-txt');
    const adminMenuItem = document.getElementById('admin-menu-item');
    
    if (currentUser && icon) {
        icon.classList.replace('fa-user', 'fa-user-check');
        icon.classList.replace('text-gray-400', 'text-beige');
        if(mobileTxt) mobileTxt.innerText = "Mi Perfil";
        
        if (userProfile?.esAdmin) {
            if(adminMenuItem) adminMenuItem.classList.remove('hidden');
        } else {
            if(adminMenuItem) adminMenuItem.classList.add('hidden');
        }
    } else if(icon) {
        icon.classList.replace('fa-user-check', 'fa-user');
        icon.classList.replace('text-beige', 'text-gray-400');
        if(mobileTxt) mobileTxt.innerText = "Mi Cuenta";
        if(adminMenuItem) adminMenuItem.classList.add('hidden');
    }
}

function openAuthModal() {
    history.pushState({modal: 'auth'}, null, "");
    const modal = document.getElementById('auth-modal');
    if(!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('locked');
    
    if (currentUser && userProfile) {
        const loginView = document.getElementById('auth-login-view');
        const regView = document.getElementById('auth-register-view');
        const loggedView = document.getElementById('auth-logged-view');
        const recoverView = document.getElementById('auth-recover-view');
        if(loginView) loginView.classList.add('hidden');
        if(regView) regView.classList.add('hidden');
        if(loggedView) loggedView.classList.remove('hidden');
        if(recoverView) recoverView.classList.add('hidden');
        switchUserTab('perfil');
        
        const dirCompleta = `${userProfile.calle || ''} ${userProfile.numero_casa || ''}, ${userProfile.comuna || ''}, ${userProfile.region || ''}`;
        
        const dNombre = document.getElementById('display-nombre');
        const dTel = document.getElementById('display-telefono');
        const dDir = document.getElementById('display-direccion');
        const dRef = document.getElementById('display-referencia');

        if(dNombre) dNombre.innerText = escapeHTML(userProfile.nombre || '-');
        if(dTel) dTel.innerText = escapeHTML(userProfile.telefono || '-');
        if(dDir) dDir.innerText = dirCompleta.trim().length > 3 ? dirCompleta : (userProfile.direccion_defecto || '-');
        if(dRef) dRef.innerText = escapeHTML(userProfile.referencia || '-');
        
        const eNombre = document.getElementById('edit-nombre');
        const eTel = document.getElementById('edit-telefono');
        const eCalle = document.getElementById('edit-calle');
        const eNum = document.getElementById('edit-numero');
        const eReg = document.getElementById('edit-region');
        const eCom = document.getElementById('edit-comuna');
        const eRef = document.getElementById('edit-referencia');

        if(eNombre) eNombre.value = userProfile.nombre || '';
        if(eTel) eTel.value = userProfile.telefono || '';
        if(eCalle) eCalle.value = userProfile.calle || '';
        if(eNum) eNum.value = userProfile.numero_casa || '';
        
        if(userProfile.region && eReg) {
            eReg.value = userProfile.region;
            actualizarComunas('edit');
            if(userProfile.comuna && eCom) eCom.value = userProfile.comuna;
        }
        
        if(eRef) eRef.value = userProfile.referencia || '';
    } else {
        const loggedView = document.getElementById('auth-logged-view');
        const regView = document.getElementById('auth-register-view');
        const loginView = document.getElementById('auth-login-view');
        const recoverView = document.getElementById('auth-recover-view');
        if(loggedView) loggedView.classList.add('hidden');
        if(regView) regView.classList.add('hidden');
        if(loginView) loginView.classList.remove('hidden');
        if(recoverView) recoverView.classList.add('hidden');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if(!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('locked');
    if(history.state && history.state.modal === 'auth') history.back();
}

function toggleAuthView() {
    const login = document.getElementById('auth-login-view');
    const reg = document.getElementById('auth-register-view');
    if(!login || !reg) return;
    if(login.classList.contains('hidden')) {
        login.classList.remove('hidden'); 
        reg.classList.add('hidden');
    } else {
        login.classList.add('hidden'); 
        reg.classList.remove('hidden');
    }
    const recoverView = document.getElementById('auth-recover-view');
    if(recoverView) recoverView.classList.add('hidden');
}

function mostrarRecuperarPass() {
    const loginView = document.getElementById('auth-login-view');
    const regView = document.getElementById('auth-register-view');
    const loggedView = document.getElementById('auth-logged-view');
    const recoverView = document.getElementById('auth-recover-view');
    if(loginView) loginView.classList.add('hidden');
    if(regView) regView.classList.add('hidden');
    if(loggedView) loggedView.classList.add('hidden');
    if(recoverView) recoverView.classList.remove('hidden');
}

function volverALogin() {
    const recoverView = document.getElementById('auth-recover-view');
    const loginView = document.getElementById('auth-login-view');
    if(recoverView) recoverView.classList.add('hidden');
    if(loginView) loginView.classList.remove('hidden');
}

async function enviarRecuperacion(e) {
    e.preventDefault();
    const email = document.getElementById('recover-email').value;
    const btn = document.getElementById('btn-recover-submit');
    btn.innerText = "Enviando...";
    btn.disabled = true;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });

    if (error) {
        mostrarToast("Error: " + error.message, "error");
    } else {
        mostrarToast("¡Revisa tu correo! Te enviamos un enlace.", "success");
        setTimeout(() => volverALogin(), 2000);
    }
    btn.innerText = "Enviar enlace";
    btn.disabled = false;
}

function switchUserTab(tab) {
    const btnPerfil = document.getElementById('tab-mi-perfil');
    const btnPedidos = document.getElementById('tab-mis-pedidos');
    const viewPerfil = document.getElementById('user-perfil-view');
    const viewPedidos = document.getElementById('user-pedidos-view');
    if(!btnPerfil || !btnPedidos || !viewPerfil || !viewPedidos) return;

    if(tab === 'perfil') {
        btnPerfil.classList.add('text-beige', 'border-beige');
        btnPerfil.classList.remove('text-gray-500');
        btnPedidos.classList.remove('text-beige', 'border-beige');
        btnPedidos.classList.add('text-gray-500');
        
        viewPerfil.classList.remove('hidden');
        viewPedidos.classList.add('hidden');
        cancelEditProfile();
    } else {
        btnPedidos.classList.add('text-beige', 'border-beige');
        btnPedidos.classList.remove('text-gray-500');
        btnPerfil.classList.remove('text-beige', 'border-beige');
        btnPerfil.classList.add('text-gray-500');
        
        viewPerfil.classList.add('hidden');
        viewPedidos.classList.remove('hidden');
        cargarMisPedidos();
    }
}

async function cargarMisPedidos() {
    const contenedor = document.getElementById('lista-mis-pedidos');
    if(!contenedor) return;
    contenedor.innerHTML = '<p class="text-center text-sm text-gray-400 mt-6"><i class="fa fa-spinner fa-spin text-beige"></i> Buscando pedidos...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        if (data.length === 0) {
            contenedor.innerHTML = '<p class="text-center text-sm text-gray-400 mt-6"><i class="fa fa-box-open mb-2 text-2xl"></i><br>Aún no tienes pedidos.</p>';
            return;
        }

        contenedor.innerHTML = data.map(pedido => {
            let bgEstado = 'bg-yellow-100 text-yellow-800';
            if (pedido.estado && pedido.estado.toLowerCase().includes('pagado')) bgEstado = 'bg-green-100 text-green-800';
            else if (pedido.estado && pedido.estado.toLowerCase().includes('rechazado')) bgEstado = 'bg-red-100 text-red-800';

            const fecha = new Date(pedido.created_at).toLocaleDateString('es-CL');
            
            return `
            <div class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="font-bold text-gray-800">Pedido #${pedido.id}</span>
                        <p class="text-[10px] text-gray-400">${escapeHTML(fecha)}</p>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-md ${bgEstado}">${escapeHTML(pedido.estado || 'Pendiente')}</span>
                </div>
                <div class="border-t border-gray-100 mt-2 pt-2 flex justify-between items-center">
                    <span class="text-xs text-gray-500">Envío: ${escapeHTML(pedido.tipo_envio.toUpperCase())}</span>
                    <span class="font-black text-gray-900">$${pedido.total.toLocaleString()}</span>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="verDetallePedido(${pedido.id})" class="text-beige font-bold text-xs underline hover:no-underline bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">Ver detalle</button>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error(err);
        contenedor.innerHTML = '<p class="text-center text-sm text-red-400 mt-6">Error al cargar el historial.</p>';
    }
}

async function verDetallePedido(orderId) {
    const modalContent = document.getElementById('order-detail-content');
    const orderModal = document.getElementById('order-detail-modal');
    if(!modalContent || !orderModal) return;

    modalContent.innerHTML = '<p class="text-center text-gray-500"><i class="fa fa-spinner fa-spin"></i> Cargando detalles...</p>';
    orderModal.classList.remove('hidden');
    orderModal.classList.add('flex');
    document.body.classList.add('locked');

    try {
        const { data: pedido, error: pedidoError } = await supabaseClient
            .from('orders')
            .select('*, profiles:user_id ( nombre, telefono )')
            .eq('id', orderId)
            .single();

        if (pedidoError) throw pedidoError;

        // Buscamos los items y traemos el nombre desde la tabla productos
        const { data: items, error: itemsError } = await supabaseClient
            .from('order_items')
            .select('*, productos:product_id ( producto )')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        const fecha = new Date(pedido.created_at).toLocaleString('es-CL');
        const cliente = pedido.profiles || { nombre: 'Desconocido', telefono: '' };

        let colorEstado = 'text-yellow-600 bg-yellow-50 border-yellow-200';
        let iconEstado = 'fa-clock';
        const estLower = (pedido.estado || '').toLowerCase();
        
        if (estLower.includes('pagado')) { colorEstado = 'text-green-600 bg-green-50 border-green-200'; iconEstado = 'fa-check-circle'; }
        else if (estLower.includes('reparto')) { colorEstado = 'text-indigo-600 bg-indigo-50 border-indigo-200'; iconEstado = 'fa-truck-fast'; }
        else if (estLower.includes('entregado')) { colorEstado = 'text-green-800 bg-green-100 border-green-300'; iconEstado = 'fa-box-open'; }
        else if (estLower.includes('rechazado') || estLower.includes('expirado')) { colorEstado = 'text-red-600 bg-red-50 border-red-200'; iconEstado = 'fa-times-circle'; }

        let itemsHTML = '';
        let subtotal = 0;
        items.forEach(item => {
            const subtotalItem = item.cantidad * item.precio_historico;
            subtotal += subtotalItem;
            // Al simplificar, omitimos la foto real y usamos el SVG o un icono
            itemsHTML += `
                <div class="flex gap-4 py-4 border-b border-gray-100 items-center">
                    <div class="w-16 h-16 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                        <i class="fa fa-hamburger text-2xl text-gray-300"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-bold text-sm text-gray-800 leading-tight">${escapeHTML(item.productos?.producto || 'Producto')}</p>
                        <p class="text-xs text-gray-500 mt-1">Cant: ${item.cantidad} x $${item.precio_historico.toLocaleString()}</p>
                    </div>
                    <div class="font-black text-gray-900">$${subtotalItem.toLocaleString()}</div>
                </div>
            `;
        });

        modalContent.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div class="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Orden de Compra</p>
                        <h4 class="text-2xl font-black text-gray-900">#${pedido.id}</h4>
                        <p class="text-xs text-gray-500 mt-1"><i class="fa fa-calendar-alt"></i> ${fecha}</p>
                    </div>
                    <div class="px-4 py-2 rounded-xl border ${colorEstado} flex items-center gap-2 font-bold text-sm">
                        <i class="fa ${iconEstado}"></i> ${escapeHTML(pedido.estado)}
                    </div>
                </div>
                
                <div class="p-6">
                    <h4 class="font-black text-lg mb-4 text-gray-800">Resumen de Productos</h4>
                    <div class="mb-6">${itemsHTML}</div>
                    
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                        <div class="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>$${subtotal.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between text-sm text-gray-600 pb-2 border-b border-gray-200">
                            <span>Envío (${escapeHTML(pedido.tipo_envio.toUpperCase())})</span>
                            <span>$${pedido.costo_envio.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between text-lg font-black text-gray-900 pt-2">
                            <span>Total Pagado</span>
                            <span>$${pedido.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-6">
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h4 class="font-black text-md mb-4 text-gray-800"><i class="fa fa-map-location-dot text-beige mr-2"></i> Datos de Despacho</h4>
                    <p class="text-sm font-bold text-gray-900 mb-1">${escapeHTML(cliente.nombre)}</p>
                    <p class="text-sm text-gray-600 mb-1"><i class="fa fa-phone w-4 text-gray-400"></i> ${escapeHTML(cliente.telefono)}</p>
                    <p class="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">${escapeHTML(pedido.direccion_envio)}</p>
                </div>
            </div>
        `;

    } catch (error) {
        console.error(error);
        modalContent.innerHTML = '<p class="text-center text-red-500 font-bold p-8">Error al cargar detalle del pedido. Intenta nuevamente.</p>';
    }
}

function cerrarDetallePedido() {
    const modal = document.getElementById('order-detail-modal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.body.classList.remove('locked');
}

async function registrarUsuario(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const emailConfirm = document.getElementById('reg-email-confirm').value;
    if(email !== emailConfirm) { mostrarToast("Los correos no coinciden", "error"); return; }
    
    const btn = document.getElementById('btn-reg-submit');
    btn.innerText = "Creando cuenta..."; 
    btn.disabled = true;
    
    const pass = document.getElementById('reg-pass').value;
    const nombre = document.getElementById('reg-nombre').value;
    const telefono = document.getElementById('reg-telefono').value;
    const calle = document.getElementById('reg-calle').value;
    const num = document.getElementById('reg-numero').value;
    const region = document.getElementById('reg-region').value;
    const comuna = document.getElementById('reg-comuna').value;
    const ref = document.getElementById('reg-referencia').value;

    const direccionCompatibilidad = `${calle} ${num}, ${comuna}, ${region}`;

    try {
        const { data: authData, error: authErr } = await supabaseClient.auth.signUp({ email, password: pass });
        if (authErr) throw authErr;
        
        if (authData.user) {
            const { error: profileErr } = await supabaseClient.from('profiles').insert({
                id: authData.user.id,
                nombre, telefono, 
                calle: calle,
                numero_casa: num,
                region: region,
                comuna: comuna,
                direccion_defecto: direccionCompatibilidad, 
                referencia: ref, 
                rol: 'cliente'
            });
            if (profileErr) throw profileErr;
        }
        mostrarToast("¡Cuenta creada con éxito!");
        closeAuthModal();
    } catch (error) {
        mostrarToast("Error: " + (error.message || "No se pudo crear"), "error");
    } finally {
        btn.innerText = "Crear mi cuenta"; 
        btn.disabled = false;
    }
}

async function iniciarSesion(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login-submit');
    btn.innerText = "Ingresando..."; 
    btn.disabled = true;
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) { 
        mostrarToast("Correo o contraseña incorrectos", "error"); 
    } else { 
        currentUser = data.user;
        await cargarPerfil(currentUser.id);
        mostrarToast("¡Bienvenido de vuelta!"); 
        closeAuthModal(); 
    }
    btn.innerText = "Ingresar"; 
    btn.disabled = false;
}

function showEditProfile() {
    const readonly = document.getElementById('profile-readonly');
    const edit = document.getElementById('profile-edit');
    if(readonly) readonly.classList.add('hidden');
    if(edit) edit.classList.remove('hidden');
}

function cancelEditProfile() {
    const readonly = document.getElementById('profile-readonly');
    const edit = document.getElementById('profile-edit');
    if(readonly) readonly.classList.remove('hidden');
    if(edit) edit.classList.add('hidden');
}

async function actualizarPerfil(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-update-profile');
    btn.innerText = "Guardando...";
    btn.disabled = true;

    const calle = document.getElementById('edit-calle').value;
    const num = document.getElementById('edit-numero').value;
    const region = document.getElementById('edit-region').value;
    const comuna = document.getElementById('edit-comuna').value;
    const direccionCompatibilidad = `${calle} ${num}, ${comuna}, ${region}`;

    const updates = {
        nombre: document.getElementById('edit-nombre').value,
        telefono: document.getElementById('edit-telefono').value,
        calle: calle,
        numero_casa: num,
        region: region,
        comuna: comuna,
        direccion_defecto: direccionCompatibilidad,
        referencia: document.getElementById('edit-referencia').value
    };

    const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
    if (error) {
        mostrarToast("Error al actualizar: " + error.message, "error");
    } else {
        mostrarToast("Perfil actualizado correctamente", "success");
        await cargarPerfil(currentUser.id);
        openAuthModal();
    }
    btn.innerText = "Guardar cambios";
    btn.disabled = false;
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    userProfile = null;
    actualizarBotonesUsuario();
    
    const loginForm = document.getElementById('login-form');
    const editForm = document.getElementById('edit-profile-form');
    if(loginForm) loginForm.reset();
    if(editForm) editForm.reset();
    
    const loggedView = document.getElementById('auth-logged-view');
    const loginView = document.getElementById('auth-login-view');
    if(loggedView) loggedView.classList.add('hidden');
    if(loginView) loginView.classList.remove('hidden');
    
    cart = [];
    localStorage.removeItem('tiococo_cart');
    actualizarOpcionEnvioSegunDireccion();
    updateCartUI();
    
    mostrarToast("Sesión cerrada", "info");
    closeAuthModal();
}

function esRegionMetropolitana(direccionOrRegion) {
    if (!direccionOrRegion) return false;
    const lower = direccionOrRegion.toLowerCase();
    return lower.includes('metropolitana') || lower.includes('rm') || lower.includes('santiago');
}

function actualizarOpcionEnvioSegunDireccion() {
    let esRM = false;
    let comunaSeleccionada = '';
    
    const selectorRegRegion = document.getElementById('reg-region');
    const selectorEditRegion = document.getElementById('edit-region');
    
    if (selectorEditRegion && selectorEditRegion.value && document.getElementById('profile-edit') && !document.getElementById('profile-edit').classList.contains('hidden')) {
        esRM = esRegionMetropolitana(selectorEditRegion.value);
        comunaSeleccionada = document.getElementById('edit-comuna').value;
    } else if (selectorRegRegion && selectorRegRegion.value && document.getElementById('auth-register-view') && !document.getElementById('auth-register-view').classList.contains('hidden')) {
        esRM = esRegionMetropolitana(selectorRegRegion.value);
        comunaSeleccionada = document.getElementById('reg-comuna').value;
    } else if (userProfile) {
        esRM = esRegionMetropolitana(userProfile.region || userProfile.direccion_defecto);
        comunaSeleccionada = userProfile.comuna || '';
    }

    if (esRM) {
        costoEnvio = 3500; 
    } else {
        costoEnvio = 0; 
    }

    const envioMontoEl = document.getElementById('cart-envio-monto');
    const envioLabelEl = document.getElementById('cart-envio-label');
    
    if (envioMontoEl && envioLabelEl) {
        if (userProfile || (selectorRegRegion && selectorRegRegion.value)) {
            if (esRM) {
                envioLabelEl.innerText = "Envío RM:";
                envioMontoEl.innerText = `+$${costoEnvio.toLocaleString()}`;
            } else {
                envioLabelEl.innerText = "Envío a Regiones:";
                envioMontoEl.innerText = "Por Pagar (Starken)";
            }
        } else {
            envioLabelEl.innerText = "Costo de envío:";
            envioMontoEl.innerText = "Inicia sesión para calcular";
        }
    }
    calcularTotal();
}

// --- CARRITO ---
async function addToCart(id) {
    const p = db.find(x => x.id === id);
    if (!p) { mostrarToast("Producto no encontrado", "error"); return; }
    
    let item = cart.find(i => i.id === id);
    if (item) item.qty++;
    else cart.push({ ...p, qty: 1 });
    
    if (currentUser) {
        await syncCartToDB();
    } else {
        localStorage.setItem('tiococo_cart', JSON.stringify(cart));
    }
    
    updateCartUI();
    mostrarToast("¡Agregado al pedido!");
    
    const badge = document.getElementById('cart-badge');
    if(badge) {
        badge.classList.add('scale-125');
        setTimeout(() => badge.classList.remove('scale-125'), 200);
    }
    const icon = document.getElementById('cart-icon');
    if(icon) icon.classList.replace('text-gray-400', 'text-beige');
    
    if (window.innerWidth >= 1024 && !hasOpenedCartAutomatically) {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar && sidebar.classList.contains('translate-x-full')) { 
            toggleCart(); 
            hasOpenedCartAutomatically = true; 
        }
    }
}

async function cambiarCantidad(id, n) {
    let item = cart.find(x => x.id === id);
    if(!item) return;
    
    item.qty += n;
    if(item.qty <= 0) await removeFromCart(id); 
    else {
        if (currentUser) await syncCartToDB();
        else localStorage.setItem('tiococo_cart', JSON.stringify(cart));
        updateCartUI();
    }
}

async function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    if (currentUser) {
        await supabaseClient.from('cart_items').delete().eq('user_id', currentUser.id).eq('product_id', id);
    } else {
        localStorage.setItem('tiococo_cart', JSON.stringify(cart));
    }
    updateCartUI();
    if(cart.length === 0) {
        const icon = document.getElementById('cart-icon');
        if(icon) icon.classList.replace('text-beige', 'text-gray-400');
        forceCloseCart();
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    const stickyBar = document.getElementById('mobile-sticky-bar');
    if(!sidebar) return;
    const isOpen = sidebar.classList.contains('translate-x-0');
    
    if (cart.length === 0 && !isOpen) { mostrarToast("Tu carrito está vacío", "info"); return; }
    
    if (!isOpen) { 
        history.pushState({modal: 'cart'}, null, "");
        sidebar.classList.remove('translate-x-full'); 
        sidebar.classList.add('translate-x-0'); 
        if(overlay) overlay.classList.add('open'); 
        document.body.classList.add('locked');
        if(window.innerWidth < 1024 && stickyBar) stickyBar.classList.add('hidden');
        
        if(currentUser && userProfile) actualizarOpcionEnvioSegunDireccion();
    } else history.back();
}

function toggleMobileMenu() { 
    const sidebar = document.getElementById('left-sidebar');
    if(!sidebar) return;
    if (sidebar.classList.contains('-translate-x-full')) { 
        history.pushState({modal: 'menu'}, null, ""); 
        sidebar.classList.remove('-translate-x-full'); 
        const overlay = document.getElementById('menu-overlay');
        if(overlay) overlay.classList.add('open'); 
        document.body.classList.add('locked');
    } else history.back(); 
}

function handleBackAction() { history.back(); }

function forceCloseCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    const stickyBar = document.getElementById('mobile-sticky-bar');
    if(sidebar) {
        sidebar.classList.remove('translate-x-0'); 
        sidebar.classList.add('translate-x-full'); 
    }
    if(overlay) overlay.classList.remove('open'); 
    document.body.classList.remove('locked');
    
    if(stickyBar) {
        if(cart.length === 0) stickyBar.classList.add('hidden'); 
        else if(window.innerWidth < 1024) stickyBar.classList.remove('translate-y-full');
    }
}

function updateCartUI() {
    try { localStorage.setItem('tiococo_cart', JSON.stringify(cart)); } catch (e) {}
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
    const badge = document.getElementById('cart-badge');
    if(badge) {
        badge.innerText = totalItems;
        badge.classList.toggle('scale-0', totalItems === 0);
    }
    
    const list = document.getElementById('cart-items');
    const stickyBar = document.getElementById('mobile-sticky-bar');
    const floatingBtn = document.getElementById('desktop-floating-cart');
    const headerTotal = document.getElementById('header-total');
    
    if (cart.length === 0) {
        if(list) list.innerHTML = `<div class="text-center text-gray-300 mt-20 flex flex-col items-center"><i class="fa fa-shopping-bag text-5xl mb-4 opacity-20"></i><p class="text-sm">Tu carrito está vacío</p></div>`;
        if(stickyBar) stickyBar.classList.add('hidden'); 
        if(floatingBtn) floatingBtn.classList.add('hidden');
        if(headerTotal) headerTotal.classList.remove('opacity-100');
    } else {
        if(list) list.innerHTML = cart.map((p) => `
            <div class="flex gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-beige/20 transition-all">
                <div class="w-14 h-14 rounded flex items-center justify-center bg-white border shrink-0">
                    <i class="fa fa-hamburger text-2xl text-gray-300"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-xs text-gray-800 truncate">${escapeHTML(p.nombre)}</h4>
                    <p class="text-xs font-black text-gray-900">$${(p.precio * p.qty).toLocaleString()}</p>
                </div>
                <div class="flex flex-col items-center bg-white rounded border border-gray-200">
                    <button onclick="cambiarCantidad(${p.id}, 1)" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black text-xs">+</button>
                    <span class="text-xs font-bold">${p.qty}</span>
                    <button onclick="cambiarCantidad(${p.id}, -1)" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-500 text-xs">-</button>
                </div>
            </div>
        `).join('');
        if(window.innerWidth < 1024 && stickyBar) {
            const sidebar = document.getElementById('cart-sidebar');
            if(sidebar && sidebar.classList.contains('translate-x-full')) { 
                stickyBar.classList.remove('hidden'); 
                stickyBar.classList.remove('translate-y-full'); 
            }
        }
        if(window.innerWidth >= 1024 && floatingBtn) floatingBtn.classList.remove('hidden');
    }
    calcularTotal();
}

function calcularTotal() {
    let subtotal = cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
    let envio = userProfile ? costoEnvio : 0;

    totalPagarFinal = subtotal + envio;
    
    const subtotalFmt = `$${subtotal.toLocaleString()}`;
    
    const elementsToUpdate = [
        'mobile-total-sticky', 'desktop-floating-total', 'header-total', 'cart-subtotal'
    ];
    elementsToUpdate.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = subtotalFmt;
    });

    const cartTotal = document.getElementById('cart-total');
    if(cartTotal) cartTotal.innerText = `$${totalPagarFinal.toLocaleString()}`;
    
    const headerTotal = document.getElementById('header-total');
    if(headerTotal) {
        if(cart.length > 0) headerTotal.classList.add('opacity-100'); 
        else headerTotal.classList.remove('opacity-100');
    }
}

async function sincronizarCarritoConBD() {
    if (!currentUser) return;
    const { data: dbCart, error } = await supabaseClient.from('cart_items').select('product_id, quantity').eq('user_id', currentUser.id);
    if (error) return;
    
    const dbCartMap = new Map();
    dbCart.forEach(item => dbCartMap.set(item.product_id, item.quantity));
    
    const mergedCart = [];
    const processed = new Set();
    
    for (let item of cart) {
        const dbQty = dbCartMap.get(item.id) || 0;
        const finalQty = item.qty + dbQty;
        if (finalQty > 0) mergedCart.push({ ...item, qty: finalQty });
        processed.add(item.id);
    }
    
    for (let [prodId, qty] of dbCartMap.entries()) {
        if (!processed.has(prodId)) {
            const p = db.find(x => x.id === prodId);
            if (p) {
                mergedCart.push({ 
                    id: p.id, sku: p.sku, nombre: p.nombre, precio: p.precio, 
                    img: p.img, disponible: p.disponible, stock: p.stock, 
                    qty: qty
                });
            }
        }
    }
    
    cart = mergedCart;
    localStorage.setItem('tiococo_cart', JSON.stringify(cart));
    
    await supabaseClient.from('cart_items').delete().eq('user_id', currentUser.id);
    if (cart.length > 0) {
        const inserts = cart.map(item => ({ user_id: currentUser.id, product_id: item.id, quantity: item.qty }));
        await supabaseClient.from('cart_items').insert(inserts);
    }
    updateCartUI();
}

async function syncCartToDB() {
    if (!currentUser) return;
    await supabaseClient.from('cart_items').delete().eq('user_id', currentUser.id);
    if (cart.length > 0) {
        const inserts = cart.map(item => ({ user_id: currentUser.id, product_id: item.id, quantity: item.qty }));
        await supabaseClient.from('cart_items').insert(inserts);
    }
}

function mostrarLoaderPago(mostrar) {
    const loader = document.getElementById('payment-loader-modal');
    if(!loader) return;
    if (mostrar) {
        forceCloseCart();
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
        document.body.classList.add('locked');
    } else {
        loader.classList.add('opacity-0');
        setTimeout(() => {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            document.body.classList.remove('locked');
        }, 300);
    }
}

// --- CHECKOUT ---
async function procesarCheckout() {
    if(cart.length === 0) return;
    if(!currentUser) { mostrarToast("Debes iniciar sesión para pedir", "info"); openAuthModal(); return; }
    if (!userProfile) { mostrarToast("Cargando tu perfil...", "info"); await cargarPerfil(currentUser.id); }
    if (!userProfile || !userProfile.calle || !userProfile.telefono) {
        mostrarToast("Completa tus datos de envío en Mi Cuenta", "error");
        openAuthModal();
        return;
    }

    try {
        mostrarLoaderPago(true); 

        const tipoEnvioCalculado = esRegionMetropolitana(userProfile.region || userProfile.direccion_defecto) ? "rm" : "regiones";
        
        let tipoDocTexto = "Boleta";
        const radiosDoc = document.getElementsByName('tipo_doc');
        if(radiosDoc) {
            for(const r of radiosDoc) { if(r.checked) tipoDocTexto = r.value; }
        }

        const { data: orderData, error: orderError } = await supabaseClient.from('orders').insert({
            user_id: currentUser.id,
            total: totalPagarFinal,
            estado: 'En preparación', 
            direccion_envio: `${userProfile.calle} ${userProfile.numero_casa}, ${userProfile.comuna}, ${userProfile.region}` + (userProfile.referencia ? ` | Ref: ${userProfile.referencia}` : ''),
            tipo_envio: tipoEnvioCalculado,
            costo_envio: costoEnvio,
            tipo_doc: tipoDocTexto
        }).select().single();

        if (orderError) throw orderError;

        const orderItems = cart.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            cantidad: item.qty,
            precio_historico: item.precio
        }));
        await supabaseClient.from('order_items').insert(orderItems);

        await supabaseClient.from('cart_items').delete().eq('user_id', currentUser.id);
        cart = [];
        updateCartUI();
        mostrarLoaderPago(false);

        let mensaje = `🍔 *¡Hola Tiococo! Quiero hacer el pedido #${orderData.id}:*\n\n`;
        orderItems.forEach((item) => {
            const productoOriginal = db.find(p => p.id === item.product_id);
            const nombre = productoOriginal ? productoOriginal.nombre : 'Producto';
            mensaje += `▪️ ${item.cantidad}x ${nombre} - $${(item.precio_historico * item.cantidad).toLocaleString()}\n`;
        });

        let subtotal = totalPagarFinal - costoEnvio;
        mensaje += `\n💰 *Subtotal:* $${subtotal.toLocaleString()}`;
        mensaje += `\n🚚 *Envío:* $${costoEnvio.toLocaleString()}`;
        mensaje += `\n🧾 *TOTAL A PAGAR:* $${totalPagarFinal.toLocaleString()}\n\n`;

        mensaje += `📍 *Mis Datos de Despacho:*\n`;
        mensaje += `Nombre: ${userProfile.nombre}\n`;
        mensaje += `Teléfono: ${userProfile.telefono}\n`;
        mensaje += `Dirección: ${userProfile.calle} ${userProfile.numero_casa}, ${userProfile.comuna}\n`;
        if (userProfile.referencia) mensaje += `Referencia: ${userProfile.referencia}\n`;
        mensaje += `\nQuedo atento para coordinar el pago. ¡Gracias!`;

        const encodedText = encodeURIComponent(mensaje);
        window.open(`https://wa.me/${WHATSAPP_NUM}?text=${encodedText}`, '_blank');
        forceCloseCart();

    } catch (err) {
        console.error(err);
        mostrarLoaderPago(false);
        mostrarToast("Hubo un error al generar tu pedido. Intenta nuevamente.", "error");
    }
}

// --- ADMINISTRADOR Y MODALES ---
function cardHTML(p) {
    return `
        <div class="bg-white rounded-2xl border border-gray-100 hover:border-beige/50 transition-all duration-300 group hover:shadow-lg relative flex flex-col h-full overflow-hidden shadow-sm">
            <div class="relative h-48 md:h-56 bg-gray-50 p-2 cursor-pointer flex items-center justify-center" onclick="openProduct(${p.id})">
                <i class="fa fa-hamburger text-6xl text-gray-300 group-hover:scale-110 transition duration-500"></i>
            </div>
            <div class="p-4 flex flex-col grow">
                <h4 class="font-medium text-gray-800 text-sm mb-1 leading-snug line-clamp-2 grow">${escapeHTML(p.nombre)}</h4>
                <div class="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                    <span class="font-black text-lg text-gray-900">$${p.precio.toLocaleString()}</span>
                    <button onclick="addToCart(${p.id})" class="bg-gray-900 text-white hover:bg-beige text-xs font-bold px-3 py-2 rounded-lg transition uppercase">Agregar</button>
                </div>
            </div>
        </div>`;
}

function openProduct(id) {
    history.pushState({modal: 'product'}, null, "");
    const p = db.find(x => x.id === id);
    if(!p) return;
    const modal = document.getElementById('product-modal');
    if(!modal) return;
    
    const content = document.getElementById('modal-content');
    if(content) {
        content.innerHTML = `
            <div class="flex flex-col h-full relative">
                <div class="flex-1 overflow-y-auto p-6 md:p-8 modal-body-scroll">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-4">
                        <div class="flex items-center justify-center bg-gray-50 rounded-2xl p-4 md:p-16 border border-gray-100">
                            <i class="fa fa-hamburger text-8xl text-gray-300"></i>
                        </div>
                        <div class="flex flex-col justify-start">
                            <h1 class="text-2xl md:text-3xl font-black text-gray-900 mb-2 leading-tight">${escapeHTML(p.nombre)}</h1>
                            <p class="text-sm font-mono text-gray-400 mb-4">SKU: ${escapeHTML(p.sku)}</p>
                            <p class="text-gray-600 leading-relaxed mb-6 font-medium">${escapeHTML(p.desc)}</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 md:p-6 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-10 shrink-0">
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex flex-col">
                            <span class="text-[10px] text-gray-400 font-bold uppercase">Precio</span>
                            <span class="text-2xl md:text-3xl font-black text-gray-900">$${p.precio.toLocaleString()}</span>
                        </div>
                        <button onclick="addToCart(${p.id}); closeProductModal()" class="flex-1 md:flex-none md:w-1/2 bg-black text-white py-3 md:py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-beige transition shadow-lg text-sm truncate px-2">Agregar al Pedido</button>
                    </div>
                </div>
            </div>`;
    }
    modal.classList.remove('hidden'); 
    document.body.classList.add('locked');
}

function closeProductModal() { 
    const modal = document.getElementById('product-modal');
    if(modal) modal.classList.add('hidden'); 
    document.body.classList.remove('locked'); 
    history.back(); 
}

function openAdminModal() {
    history.pushState({modal: 'admin'}, null, "");
    const modal = document.getElementById('admin-modal');
    if(modal) modal.classList.remove('hidden');
    document.body.classList.add('locked');
    cargarProductosAdmin();
    cancelarEdicion();
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if(modal) modal.classList.add('hidden');
    document.body.classList.remove('locked');
    if(history.state && history.state.modal === 'admin') history.back();
}

function switchAdminTab(tab) {
    if (!userProfile?.esAdmin) {
        mostrarToast("Acceso no autorizado", "error");
        closeAdminModal();
        return;
    }
    
    const vProd = document.getElementById('admin-productos-view');
    const vNuevo = document.getElementById('admin-nuevo-view');
    const vPed = document.getElementById('admin-pedidos-view');

    if(vProd) vProd.classList.toggle('hidden', tab !== 'productos');
    if(vNuevo) vNuevo.classList.toggle('hidden', tab !== 'nuevo');
    if(vPed) vPed.classList.toggle('hidden', tab !== 'pedidos');
    
    const tabs = ['productos', 'nuevo', 'pedidos'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(!btn) return;
        if (t === tab) {
            btn.classList.add('text-beige', 'border-beige');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('text-beige', 'border-beige');
            btn.classList.add('text-gray-500');
        }
    });

    if (tab === 'pedidos') cargarPedidosLogistica();
}

function cancelarEdicion() {
    const form = document.getElementById('producto-form');
    if(form) form.reset();
    
    const inputId = document.getElementById('producto-id');
    const btnGuardar = document.getElementById('btn-guardar-producto');
    const titulo = document.getElementById('form-titulo');
    
    if(inputId) inputId.value = '';
    if(btnGuardar) btnGuardar.innerText = 'Crear Producto';
    if(titulo) titulo.innerText = 'Agregar Nuevo Producto';
    
    productoEnEdicion = null;
    switchAdminTab('productos');
}

async function cargarProductosAdmin() {
    const { data, error } = await supabaseClient.from('productos').select('*').order('id', { ascending: false });
    if (error) { mostrarToast("Error al cargar", "error"); return; }
    
    adminDb = data;
    aplicarFiltrosAdmin();
}

function aplicarFiltrosAdmin() {
    let filtrados = adminDb;
    
    if (filtroAdminTexto) {
        const texto = filtroAdminTexto.toLowerCase();
        filtrados = filtrados.filter(p => 
            p.producto.toLowerCase().includes(texto) || 
            (p.numero_producto && p.numero_producto.toLowerCase().includes(texto))
        );
    }
    
    renderListaAdmin(filtrados);
}

function filtrarAdmin(query) {
    filtroAdminTexto = query;
    aplicarFiltrosAdmin();
}

function renderListaAdmin(lista) {
    const container = document.getElementById('admin-productos-list');
    if(!container) return;
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No se encontraron productos.</p>';
        return;
    }
    container.innerHTML = lista.map(p => `
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded bg-white border flex items-center justify-center shrink-0">
                    <i class="fa fa-hamburger text-gray-300"></i>
                </div>
                <div>
                    <p class="font-bold text-sm text-gray-800">${escapeHTML(p.producto)}</p>
                    <p class="text-[10px] text-gray-500">SKU: ${escapeHTML(p.numero_producto)} | Precio: $${p.precio}</p>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="editarProducto(${p.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa fa-pen"></i></button>
                <button onclick="eliminarProducto(${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function editarProducto(id) {
    const data = adminDb.find(x => x.id === id);
    if (!data) return;
    
    productoEnEdicion = id;
    
    const iId = document.getElementById('producto-id');
    const iNom = document.getElementById('producto-nombre');
    const iSku = document.getElementById('producto-sku');
    const iPre = document.getElementById('producto-precio');
    const iDesc = document.getElementById('producto-desc');
    const btnG = document.getElementById('btn-guardar-producto');
    const tit = document.getElementById('form-titulo');

    if(iId) iId.value = id;
    if(iNom) iNom.value = data.producto;
    if(iSku) iSku.value = data.numero_producto || '';
    if(iPre) iPre.value = data.precio;
    if(iDesc) iDesc.value = data.descripcion || '';
    
    if(btnG) btnG.innerText = 'Guardar Cambios';
    if(tit) tit.innerText = `Editar: ${escapeHTML(data.producto)}`;
    
    switchAdminTab('nuevo');
}

async function guardarProducto(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-producto');
    if(btn) { btn.innerText = "Guardando..."; btn.disabled = true; }

    const nombre = document.getElementById('producto-nombre').value;
    const sku = document.getElementById('producto-sku').value;
    const precio = parseFloat(document.getElementById('producto-precio').value);
    const desc = document.getElementById('producto-desc').value;
    const productoId = document.getElementById('producto-id').value;

    if (precio < 0) { 
        mostrarToast("El precio no puede ser negativo", "error"); 
        if(btn) { btn.innerText = productoId ? "Guardar Cambios" : "Crear Producto"; btn.disabled = false; }
        return; 
    }

    try {
        const productoData = {
            producto: nombre,
            numero_producto: sku,
            precio: precio,
            descripcion: desc,
            destacado: 0
        };

        if (productoId) {
            const { error } = await supabaseClient.from('productos').update(productoData).eq('id', productoId);
            if (error) throw error;
            mostrarToast("Producto actualizado", "success");
        } else {
            const { error } = await supabaseClient.from('productos').insert(productoData);
            if (error) throw error;
            mostrarToast("Producto creado", "success");
        }

        cancelarEdicion();
        cargarProductosAdmin();
        cargarProductosPagina(currentPage);
    } catch (err) {
        mostrarToast("Error: " + err.message, "error");
    } finally {
        if(btn) { btn.innerText = productoId ? "Guardar Cambios" : "Crear Producto"; btn.disabled = false; }
    }
}

async function eliminarProducto(id) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) {
        mostrarToast("Error al eliminar", "error");
    } else {
        mostrarToast("Producto eliminado", "success");
        cargarProductosAdmin();
        cargarProductosPagina(currentPage);
    }
}

async function cargarPedidosLogistica() {
    const container = document.getElementById('admin-lista-pedidos');
    if(!container) return;
    container.innerHTML = '<p class="text-gray-500 text-sm"><i class="fa fa-spinner fa-spin text-beige"></i> Cargando pedidos...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select(`*, profiles:user_id ( nombre, telefono ), order_items ( cantidad, precio_historico, product_id )`)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No hay pedidos registrados aún.</p>';
            return;
        }

        const pedidosConProductos = await Promise.all(data.map(async (pedido) => {
            if (pedido.order_items && pedido.order_items.length > 0) {
                const productosIds = pedido.order_items.map(item => item.product_id);
                const { data: productosData } = await supabaseClient
                    .from('productos')
                    .select('id, producto, precio')
                    .in('id', productosIds);
                
                const itemsConNombres = pedido.order_items.map(item => {
                    const prod = productosData?.find(p => p.id === item.product_id);
                    return { ...item, nombre_producto: prod ? prod.producto : 'Producto desconocido' };
                });
                return { ...pedido, order_items: itemsConNombres };
            }
            return pedido;
        }));
        
        container.innerHTML = pedidosConProductos.map(pedido => {
            const fecha = new Date(pedido.created_at).toLocaleString('es-CL');
            const cliente = pedido.profiles || { nombre: 'Desconocido', telefono: '' };
            const borderColor = {
                'Pendiente de pago': 'border-red-300',
                'Pagado': 'border-yellow-300',
                'En preparación': 'border-purple-300',
                'En reparto': 'border-indigo-300',
                'Entregado': 'border-green-300',
                'Rechazado': 'border-gray-300',
                'Expirado': 'border-gray-400'
            }[pedido.estado] || 'border-gray-200';
            
            const productosList = pedido.order_items && pedido.order_items.length > 0 
                ? `<div class="mt-3 text-xs bg-gray-50 p-2 rounded-lg">
                    <p class="font-bold text-gray-600 mb-1">Productos:</p>
                    ${pedido.order_items.map(item => 
                        `<div class="flex justify-between text-gray-700">
                            <span>${item.cantidad}x ${escapeHTML(item.nombre_producto || 'Producto')}</span>
                            <span class="font-mono">$${(item.cantidad * item.precio_historico).toLocaleString()}</span>
                        </div>`
                    ).join('')}
                   </div>`
                : '';
            
            return `
            <div class="bg-white border-2 ${borderColor} rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="font-black text-lg">#${pedido.id}</span>
                        <span class="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">${fecha}</span>
                        <span class="text-xs font-bold text-gray-700">${escapeHTML(cliente.nombre)}</span>
                        ${cliente.telefono ? `<span class="text-xs text-gray-500">📞 ${escapeHTML(cliente.telefono)}</span>` : ''}
                    </div>
                    <p class="text-sm font-bold text-gray-800"><i class="fa fa-map-marker-alt text-beige w-4"></i> ${escapeHTML(pedido.direccion_envio)}</p>
                    <p class="text-xs text-gray-500 mt-1"><i class="fa fa-truck text-gray-400 w-4"></i> Envío: ${escapeHTML(pedido.tipo_envio.toUpperCase())}</p>
                    <p class="text-sm font-black text-gray-900 mt-2">Total: $${pedido.total.toLocaleString()}</p>
                    ${productosList}
                </div>
                <div class="flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                    <label class="text-[10px] font-bold text-gray-500 uppercase mb-1">Estado del Envío</label>
                    <select onchange="cambiarEstadoPedido(${pedido.id}, this.value)" class="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none cursor-pointer focus:ring-1 focus:ring-beige">
                        <option value="Pendiente de pago" ${pedido.estado === 'Pendiente de pago' ? 'selected' : ''}>⏳ Pendiente de pago</option>
                        <option value="En preparación" ${pedido.estado === 'En preparación' ? 'selected' : ''}>📦 En preparación</option>
                        <option value="En reparto" ${pedido.estado === 'En reparto' ? 'selected' : ''}>🚚 En reparto</option>
                        <option value="Entregado" ${pedido.estado === 'Entregado' ? 'selected' : ''}>🎉 Entregado</option>
                        <option value="Rechazado" ${pedido.estado === 'Rechazado' ? 'selected' : ''}>❌ Rechazado</option>
                    </select>
                </div>
            </div>`;
        }).join('');
        
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-red-500 text-sm">Error al cargar pedidos.</p>';
        mostrarToast("Error cargando pedidos", "error");
    }
}

async function cambiarEstadoPedido(id, nuevoEstado) {
    if (nuevoEstado === 'Entregado') {
        if (!confirm("¿Confirmas que el pedido ha sido entregado?")) {
            cargarPedidosLogistica();
            return;
        }
    }
    const { error } = await supabaseClient.from('orders').update({ estado: nuevoEstado }).eq('id', id);
    if (error) { mostrarToast("Error al actualizar", "error"); } 
    else { mostrarToast(`Pedido #${id} actualizado`, "success"); cargarPedidosLogistica(); }
}

function mostrarToast(msg, type = 'success') {
    const t = document.getElementById('toast-modal');
    const c = document.getElementById('toast-content');
    if(!t || !c) return;
    let color = type === 'error' ? 'bg-red-500' : (type === 'info' ? 'bg-blue-500' : 'bg-green-500');
    let icon = type === 'error' ? 'times' : (type === 'info' ? 'info' : 'check');
    c.innerHTML = `<div class="w-6 h-6 ${color} rounded-full flex items-center justify-center text-xs text-white"><i class="fa fa-${icon}"></i></div><span class="font-bold text-sm">${msg}</span>`;
    t.classList.remove('hidden'); 
    setTimeout(() => t.classList.add('toast-visible'), 10);
    setTimeout(() => { t.classList.remove('toast-visible'); setTimeout(() => t.classList.add('hidden'), 300); }, 2500);
}

function initSwipeGestures() {
    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', function(e) { 
        touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; 
    }, {passive: true});
    document.addEventListener('touchend', function(e) {
        const diffX = touchStartX - e.changedTouches[0].screenX; 
        const diffY = Math.abs(touchStartY - e.changedTouches[0].screenY); 
        if (diffY < 30 && Math.abs(diffX) > 50) {
            const sidebar = document.getElementById('cart-sidebar');
            const leftSidebar = document.getElementById('left-sidebar');
            if (diffX > 0 && sidebar && sidebar.classList.contains('translate-x-0')) { forceCloseCart(); }
            else if (diffX < 0 && leftSidebar && !leftSidebar.classList.contains('-translate-x-full')) { handleBackAction(); }
        }
    }, {passive: true});
}
