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
let filtroActual = 'todas';
let busquedaActual = '';
let lastSearch = '';

let hasOpenedCartAutomatically = false; 
let searchTimeout; 
let costoEnvio = 3500; 
let totalPagarFinal = 0;

let currentUser = null;
let userProfile = null;
let productoEnEdicion = null;

let filtroAdminCategoria = '';
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
    generarMenuCategorias();
    cargarSelectoresRegion(); 
    
    const urlInput = document.getElementById('producto-imagen-url');
    if(urlInput) {
        urlInput.addEventListener('input', function(e) {
            const url = e.target.value;
            const previewDiv = document.getElementById('imagen-actual');
            const previewImg = document.getElementById('imagen-preview');
            
            if(url && url.startsWith('http')) {
                previewImg.src = url;
                previewDiv.classList.remove('hidden');
            } else {
                previewDiv.classList.add('hidden');
            }
        });
    }
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
    document.getElementById('loading-msg').classList.remove('hidden');
    document.getElementById('seccion-catalogo').classList.add('hidden');

    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    try {
        let query = supabaseClient.from('products').select('*', { count: 'exact' });

        if (busquedaActual.length > 0) {
            query = query.or(`producto.ilike.%${busquedaActual}%,numero_producto.ilike.%${busquedaActual}%`);
            query = query.order('id', { ascending: false });
        } else {
            if (filtroActual !== 'todas') {
                query = query.eq('categoria', filtroActual);
            }
            query = query.order('destacado', { ascending: false }); 
        }

        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        totalProductos = count || 0;

        db = data.map(p => ({
            id: p.id,
            sku: p.numero_producto || 'S/N',
            nombre: p.producto,
            desc: p.descripcion || 'Sin descripción',
            cat: p.categoria || 'Otros',
            precio: Number(p.precio) || 0,
            img: p.foto || '',
            disponible: (p.stock || 0) > 0,
            destacado: p.destacado || 0,
            stock: p.stock || 0
        }));

        renderGrid(db, page);
        renderPaginationControls(page); 
        renderDestacados(db);

        document.getElementById('loading-msg').classList.add('hidden');
        document.getElementById('seccion-catalogo').classList.remove('hidden');

    } catch (error) {
        console.error(error);
        mostrarToast("Error cargando productos", "error");
    }
}

function renderGrid(lista, page) {
    const contenedor = document.getElementById('grid-productos');
    const cantidad = document.getElementById('cantidad-productos');
    if(cantidad) cantidad.innerText = totalProductos; 
    
    if(lista.length === 0) { 
        contenedor.innerHTML = `<div class="col-span-full py-10 text-center text-gray-500 bg-white/80 rounded-xl p-6"><p>No se encontraron productos.</p></div>`; 
        document.getElementById('pagination-controls').classList.add('hidden');
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
        window.scrollTo({
            top: document.getElementById('seccion-catalogo').getBoundingClientRect().top + window.pageYOffset - 120, 
            behavior: 'smooth'
        });
    }
}

function resetAndScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    filtroActual = 'todas';
    busquedaActual = '';
    currentPage = 1;
    
    document.querySelectorAll('#nav-categorias button').forEach(b => {
        b.className = "w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 font-medium text-gray-600 flex items-center gap-3 transition-all group";
    });
    const btnTodas = document.getElementById('btn-todas');
    if (btnTodas) {
        btnTodas.className = "w-full text-left px-5 py-3 rounded-xl bg-gray-50 font-bold text-beige flex items-center gap-3 transition-all group border-l-4 border-beige";
    }

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
        
        if (busquedaActual.length > 0) {
            document.querySelectorAll('#nav-categorias button').forEach(b => {
                b.className = "w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 font-medium text-gray-600 flex items-center gap-3 transition-all group";
            });
            document.getElementById('titulo-grid').innerText = `Resultados para "${query}"`;
        } else {
            document.getElementById('titulo-grid').innerText = filtroActual === 'todas' ? 'Catálogo' : filtroActual;
        }
        
        cargarProductosPagina(1);
    }, 500);
}

function filtrar(cat, btnElement) {
    if(window.innerWidth < 1024 && !document.getElementById('left-sidebar').classList.contains('-translate-x-full')) {
        toggleMobileMenu();
    }

    document.querySelectorAll('#nav-categorias button').forEach(b => {
        b.className = "w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 font-medium text-gray-600 flex items-center gap-3 transition-all group";
    });
    if(btnElement) {
        btnElement.className = "w-full text-left px-5 py-3 rounded-xl bg-gray-50 font-bold text-beige flex items-center gap-3 transition-all group border-l-4 border-beige";
    }
    filtroActual = cat;
    busquedaActual = ''; 
    
    const searchDesktop = document.getElementById('search-desktop');
    const searchMobile = document.getElementById('search-mobile');
    if(searchDesktop) searchDesktop.value = '';
    if(searchMobile) searchMobile.value = '';
    
    document.getElementById('titulo-grid').innerText = cat === 'todas' ? 'Catálogo' : cat;
    
    currentPage = 1;
    cargarProductosPagina(1);
    window.scrollTo({ top: document.getElementById('seccion-catalogo').getBoundingClientRect().top + window.pageYOffset - 110, behavior: 'smooth' });
}

function generarMenuCategorias() {
    const nav = document.getElementById('nav-categorias');
    if(!nav) return;
    nav.innerHTML = ''; 
    const btnTodas = document.createElement('button');
    
    btnTodas.className = (filtroActual === 'todas') 
        ? "w-full text-left px-5 py-3 rounded-xl bg-gray-50 font-bold text-beige flex items-center gap-3 transition-all group border-l-4 border-beige"
        : "w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 font-medium text-gray-600 flex items-center gap-3 transition-all group";
        
    btnTodas.id = "btn-todas";
    btnTodas.onclick = () => filtrar('todas', btnTodas);
    btnTodas.innerHTML = `<i class="fa fa-border-all text-beige group-hover:scale-110 transition w-5 text-center"></i> Todo`;
    nav.appendChild(btnTodas);
    
    const categoriasManuales = [
        "Combos", "Hamburguesas", "Papas Fritas", "Bebidas", "Postres", "Otros"
    ]; // Cambié las categorías para que hagan sentido con comida rápida

    categoriasManuales.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 font-medium text-gray-600 flex items-center gap-3 transition-all group";
        btn.onclick = () => filtrar(cat, btn);
        btn.innerHTML = `<i class="fa fa-chevron-right text-gray-300 text-xs group-hover:text-beige transition"></i> ${cat}`;
        nav.appendChild(btn);
    });
}

function renderDestacados(lista) {
    const destacados = lista.filter(p => p.destacado === 1 && p.disponible).slice(0, 6); 
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
            <div class="relative h-48 md:h-56 bg-white p-2">
                <img src="${escapeHTML(p.img)}" class="w-full h-full object-contain" alt="${escapeHTML(p.nombre)}" loading="lazy" width="200" height="200" onerror="this.onerror=null; this.src='${PLACEHOLDER_SVG}'; this.classList.add('img-placeholder')">
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

// [MANTIENES TUS FUNCIONES DE MODAL DE LOGIN, REGISTRO, PERFIL, PEDIDOS IGUAL QUE ANTES]
// Para no hacer el código inmensamente largo en este mensaje, asegúrate de mantener tus funciones:
// openAuthModal, closeAuthModal, toggleAuthView, mostrarRecuperarPass, volverALogin, enviarRecuperacion
// switchUserTab, cargarMisPedidos, verDetallePedido, cerrarDetallePedido, registrarUsuario, iniciarSesion
// showEditProfile, cancelEditProfile, actualizarPerfil, cerrarSesion, esRegionMetropolitana, actualizarOpcionEnvioSegunDireccion

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
    if (!p || p.stock <= 0) { mostrarToast("Producto agotado", "error"); return; }
    let item = cart.find(i => i.id === id);
    const cantidadActual = item ? item.qty : 0;
    if (cantidadActual + 1 > p.stock) { mostrarToast(`Solo hay ${p.stock} unidades disponibles`, "error"); return; }
    
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
    const p = db.find(x => x.id === id);
    const nuevaCantidad = item.qty + n;
    if (n > 0 && nuevaCantidad > p.stock) { mostrarToast(`Máximo ${p.stock} unidades`, "error"); return; }
    
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
                <img src="${escapeHTML(p.img)}" class="w-14 h-14 rounded object-contain bg-white border" alt="${escapeHTML(p.nombre)}" width="56" height="56" onerror="this.onerror=null; this.src='${PLACEHOLDER_SVG}'; this.classList.add('img-placeholder')">
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
        const p = db.find(x => x.id === item.id);
        const maxStock = p ? p.stock : Infinity;
        const finalQty = Math.min(item.qty + dbQty, maxStock);
        if (finalQty > 0) mergedCart.push({ ...item, qty: finalQty });
        processed.add(item.id);
    }
    
    for (let [prodId, qty] of dbCartMap.entries()) {
        if (!processed.has(prodId)) {
            const p = db.find(x => x.id === prodId);
            if (p && p.stock > 0) {
                mergedCart.push({ 
                    id: p.id, sku: p.sku, nombre: p.nombre, precio: p.precio, 
                    img: p.img, disponible: p.disponible, stock: p.stock, 
                    qty: Math.min(qty, p.stock)
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

// =========================================================================
// NUEVO CHECKOUT: GUARDAR PEDIDO Y ENVIAR A WHATSAPP
// =========================================================================
async function procesarCheckout() {
    if(cart.length === 0) return;
    
    // Obligamos al usuario a tener cuenta para que no pierdas su historial de pedidos
    if(!currentUser) { mostrarToast("Debes iniciar sesión para pedir", "info"); openAuthModal(); return; }
    if (!userProfile) { mostrarToast("Cargando tu perfil...", "info"); await cargarPerfil(currentUser.id); }
    if (!userProfile || !userProfile.calle || !userProfile.rut || !userProfile.telefono) {
        mostrarToast("Completa tus datos de envío en Mi Cuenta", "error");
        openAuthModal();
        return;
    }

    try {
        mostrarLoaderPago(true); 

        // 1. Guardar el pedido en Supabase para tu historial y admin
        const tipoEnvioCalculado = esRegionMetropolitana(userProfile.region || userProfile.direccion_defecto) ? "rm" : "regiones";
        let tipoDocTexto = "Boleta";
        for(const r of document.getElementsByName('tipo_doc')) { if(r.checked) tipoDocTexto = r.value; }

        const { data: orderData, error: orderError } = await supabaseClient.from('orders').insert({
            user_id: currentUser.id,
            total: totalPagarFinal,
            estado: 'En preparación', // Entra directo a preparación porque es pago por transferencia/efectivo arreglado por WhatsApp
            direccion_envio: `${userProfile.calle} ${userProfile.numero_casa}, ${userProfile.comuna}, ${userProfile.region}` + (userProfile.referencia ? ` | Ref: ${userProfile.referencia}` : ''),
            tipo_envio: tipoEnvioCalculado,
            costo_envio: costoEnvio,
            tipo_doc: tipoDocTexto
        }).select().single();

        if (orderError) throw orderError;

        // 2. Guardar los productos de esa orden
        const orderItems = cart.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            cantidad: item.qty,
            precio_historico: item.precio
        }));
        await supabaseClient.from('order_items').insert(orderItems);

        // 3. Limpiar el carrito (ya se transformó en orden)
        await supabaseClient.from('cart_items').delete().eq('user_id', currentUser.id);
        cart = [];
        updateCartUI();
        mostrarLoaderPago(false);

        // 4. Armar el mensaje de WhatsApp
        let mensaje = `🍔 *¡Hola Tiococo! Quiero hacer el pedido #${orderData.id}:*\n\n`;
        orderItems.forEach((item, index) => {
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

        // 5. Enviar a WhatsApp
        const encodedText = encodeURIComponent(mensaje);
        window.open(`https://wa.me/${WHATSAPP_NUM}?text=${encodedText}`, '_blank');
        forceCloseCart();

    } catch (err) {
        console.error(err);
        mostrarLoaderPago(false);
        mostrarToast("Hubo un error al generar tu pedido. Intenta nuevamente.", "error");
    }
}

// [MANTIENES TUS FUNCIONES DE RENDERIZADO DE CARTAS, MODAL DE PRODUCTO Y ADMINISTRADOR IGUAL]
// cardHTML, openProduct, closeProductModal, openAdminModal, closeAdminModal, switchAdminTab
// cancelarEdicion, cargarProductosAdmin, aplicarFiltrosAdmin, filtrarAdmin, filtrarAdminPorCategoria
// renderListaAdmin, editarProducto, guardarProducto, eliminarProducto, cargarPedidosLogistica, cambiarEstadoPedido
// mostrarToast, initSwipeGestures

function cardHTML(p) {
    const btnClass = p.disponible ? "bg-gray-900 text-white hover:bg-beige" : "bg-gray-200 text-gray-400 cursor-not-allowed";
    const btnText = p.disponible ? "Agregar" : "Agotado";
    const action = p.disponible ? `addToCart(${p.id})` : "";
    const imageClass = p.disponible ? "" : "no-stock";
    return `
        <div class="bg-white rounded-2xl border border-gray-100 hover:border-beige/50 transition-all duration-300 group hover:shadow-lg relative flex flex-col h-full overflow-hidden shadow-sm">
            <div class="relative h-48 md:h-56 bg-white p-2 cursor-pointer" onclick="openProduct(${p.id})">
                <img src="${escapeHTML(p.img)}" class="w-full h-full object-contain group-hover:scale-105 transition duration-500 ${imageClass}" alt="${escapeHTML(p.nombre)}" loading="lazy" width="200" height="200" onerror="this.onerror=null; this.src='${PLACEHOLDER_SVG}'; this.classList.add('img-placeholder')">
                <span class="absolute bottom-0 left-0 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider rounded-tr-lg">${escapeHTML(p.cat.substring(0,15))}</span>
                ${!p.disponible ? '<span class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-[10px] font-bold rounded">AGOTADO</span>' : ''}
            </div>
            <div class="p-4 flex flex-col grow">
                <h4 class="font-medium text-gray-800 text-sm mb-1 leading-snug line-clamp-2 grow">${escapeHTML(p.nombre)}</h4>
                <div class="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                    <span class="font-black text-lg text-gray-900">$${p.precio.toLocaleString()}</span>
                    <button onclick="${action}" class="text-xs font-bold px-3 py-2 rounded-lg transition uppercase ${btnClass}">${btnText}</button>
                </div>
            </div>
        </div>`;
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
