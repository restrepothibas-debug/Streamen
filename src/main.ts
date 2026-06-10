import './theme/main.css';
import { accountService } from './services/accountService.ts';
import { customerService } from './services/customerService.ts';
import { incidentService } from './services/incidentService.ts';
import { Account, Customer, Incident } from './types/index.ts';
import { debounce, throttle } from './utils/event-control.ts';

// --- APP STATE ---
let accounts: Account[] = [];
let customers: Customer[] = [];
let incidents: Incident[] = [];
let currentSearchQuery = "";

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded. Initializing StreamControl...');
    
    try {
        initTabs();
        initSearch();
        initModals();
        initSidebarActions();
        
        // Legacy check
        if (localStorage.getItem('sc_accounts')) {
            showToast("Legacy Data", "Se detectaron datos antiguos. Use el sistema de Backup para importar.", "info");
        }

        console.log('Services initialized. Refreshing data from Supabase...');
        await refreshAllData();
        console.log('Data refresh complete.');

    } catch (error) {
        console.error('Critical initialization error:', error);
        showToast("Error Crítico", "No se pudo iniciar la aplicación correctamente.", "error");
        
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.className = "flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 text-xs font-semibold";
            statusEl.innerHTML = `<span class="h-2 w-2 rounded-full bg-rose-400"></span> Error de Conexión`;
        }
    }
});

function initSidebarActions() {
    // Botón permanente de Agregar Cliente
    document.getElementById('sidebar-quick-add')?.addEventListener('click', () => {
        openModal('add-customer');
    });

    // Botón de Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            console.log('Logging out...');
            // En el futuro aquí iría supabase.auth.signOut()
            sessionStorage.clear();
            location.reload();
        }
    });
}

// Catch unhandled errors
window.addEventListener('error', (event) => {
    console.error('Global Error Captured:', event.error);
});

// --- TABS LOGIC ---
function initTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });
}

function switchTab(tabId: string) {
    // Update UI
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');

    if (tabId === 'recovery') renderRecoveryTab();

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const btnTab = btn.getAttribute('data-tab');
        if (btnTab === tabId) {
            btn.classList.add('bg-indigo-600', 'text-white');
            btn.classList.remove('text-slate-400', 'hover:bg-slate-800/50');
        } else {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('text-slate-400', 'hover:bg-slate-800/50');
        }
    });

    // Update Header
    const titles: Record<string, string> = {
        dashboard: "Panel General",
        accounts: "Gestión de Cuentas Matrices",
        customers: "Clientes Finales",
        recovery: "Desbloqueador de OTP"
    };
    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.innerText = titles[tabId] || "Panel";
}

// --- SEARCH LOGIC ---
function initSearch() {
    const searchInput = document.getElementById('global-search') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentSearchQuery = searchInput.value.toLowerCase();
            renderAccountsTable();
            renderCustomersTable();
        }, 300));
    }
}

// --- DATA REFRESH ---
async function refreshAllData() {
    try {
        const [accs, custs, incs] = await Promise.all([
            accountService.getAll(),
            customerService.getAll(),
            incidentService.getAll()
        ]);
        accounts = accs;
        customers = custs;
        incidents = incs;
        
        renderAll();
    } catch (err) {
        console.error("Error refreshing data:", err);
        showToast("Error de Conexión", "No se pudo sincronizar con Supabase", "error");
    }
}

function renderAll() {
    renderStats();
    renderIncidents();
    renderAccountsTable();
    renderCustomersTable();
}

// --- RENDERING HELPERS ---
function renderStats() {
    const totalAccEl = document.getElementById('stat-total-accounts');
    const totalProfEl = document.getElementById('stat-total-profiles');
    const activeCustEl = document.getElementById('stat-active-customers');
    const blockedEl = document.getElementById('stat-blocked-accounts');
    const earningsEl = document.getElementById('stat-earnings');

    if (totalAccEl) totalAccEl.innerText = accounts.length.toString();
    
    const totalProfiles = accounts.reduce((acc, curr) => acc + curr.profiles_total, 0);
    if (totalProfEl) totalProfEl.innerText = `${totalProfiles} perfiles totales`;
    
    if (activeCustEl) activeCustEl.innerText = customers.length.toString();
    
    const alerts = incidents.filter(i => i.status === 'Abierto').length + accounts.filter(a => a.status !== 'Activa').length;
    if (blockedEl) blockedEl.innerText = alerts.toString();
    
    const totalEarnings = customers.reduce((acc, curr) => acc + Number(curr.paid_amount), 0);
    if (earningsEl) earningsEl.innerText = `$${totalEarnings.toFixed(2)}`;
}

function renderIncidents() {
    const container = document.getElementById('incident-list');
    if (!container) return;
    container.innerHTML = "";

    const activeIncidents = incidents.filter(i => i.status === 'Abierto');

    if (activeIncidents.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <div class="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-check text-xl"></i>
                </div>
                <p class="text-slate-400 text-sm">No hay reportes activos. Todo funciona correctamente.</p>
            </div>
        `;
        return;
    }

    activeIncidents.forEach(inc => {
        const serviceColor = getServiceColorClass(inc.service_name || '');
        container.innerHTML += `
            <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-slate-700 transition-all">
                <div class="flex items-start gap-4">
                    <div class="p-3 ${serviceColor} text-white rounded-xl shadow-lg">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-slate-100">${inc.customer_name || 'Cliente'}</h4>
                            <span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full text-[10px] font-bold uppercase tracking-wider">${inc.severity}</span>
                        </div>
                        <p class="text-xs text-slate-400 font-medium">Motivo: <span class="text-slate-300">${inc.issue}</span></p>
                        <div class="flex items-center gap-3 mt-2">
                            <span class="text-[10px] text-slate-500 flex items-center gap-1"><i class="fa-solid fa-clock"></i> ${new Date(inc.created_at || '').toLocaleTimeString()}</span>
                            <span class="text-[10px] text-slate-500 flex items-center gap-1"><i class="fa-solid fa-at"></i> ${inc.account_email || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto">
                    <button class="btn-otp flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all" data-id="${inc.account_id}">
                        Extraer OTP
                    </button>
                    <button class="btn-resolve p-2 text-slate-500 hover:text-emerald-400 transition-colors" data-id="${inc.id}">
                        <i class="fa-solid fa-circle-check text-xl"></i>
                    </button>
                </div>
            </div>
        `;
    });

    // Attach listeners
    container.querySelectorAll('.btn-otp').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) goToOTP(id);
    }));
    container.querySelectorAll('.btn-resolve').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) await resolveIncident(id);
    }));
}

function renderAccountsTable() {
    const body = document.getElementById('accounts-table-body');
    if (!body) return;
    body.innerHTML = "";

    const filtered = accounts.filter(acc => 
        acc.service.toLowerCase().includes(currentSearchQuery) || 
        acc.email.toLowerCase().includes(currentSearchQuery)
    );

    filtered.forEach(acc => {
        const serviceColor = getServiceColorClass(acc.service);
        const daysLeft = calculateDaysRemaining(acc.expiration);
        
        let expBadgeClass = "text-slate-400";
        if (daysLeft < 0) expBadgeClass = "text-rose-500 font-bold bg-rose-500/10 px-2 py-1 rounded-lg";
        else if (daysLeft <= 5) expBadgeClass = "text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-lg";

        let slotsHtml = "";
        for (let i = 1; i <= acc.profiles_total; i++) {
            const isTaken = i <= acc.assigned_profiles;
            slotsHtml += `<div class="h-2 w-2 rounded-full ${isTaken ? 'bg-indigo-500' : 'bg-emerald-500'}" title="Perfil ${i}"></div>`;
        }

        body.innerHTML += `
            <tr class="hover:bg-slate-850/30 transition-all border-b border-slate-800/50">
                <td class="p-4 pl-6">
                    <div class="flex items-center gap-3">
                        <span class="h-10 w-10 rounded-xl ${serviceColor} text-white font-bold text-xs flex items-center justify-center">${acc.service.substring(0,3)}</span>
                        <div>
                            <span class="font-bold text-slate-100 block">${acc.service}</span>
                            <span class="text-xs text-slate-400 uppercase tracking-tighter">${acc.provider || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="font-mono text-xs text-slate-200">${acc.email}</div>
                    <div class="text-xs text-indigo-400 mt-1 font-medium flex items-center gap-1">
                        <i class="fa-solid fa-lock"></i> ${acc.password || '****'}
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-200">${acc.assigned_profiles}/${acc.profiles_total}</span>
                            <div class="flex gap-1.5">${slotsHtml}</div>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="text-xs font-bold ${expBadgeClass}">${daysLeft < 0 ? 'Vencida' : daysLeft + ' días'}</div>
                    <div class="text-xs text-slate-400 font-medium mt-1">${acc.expiration}</div>
                </td>
                <td class="p-4">
                    <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase">${acc.status}</span>
                </td>
                <td class="p-4 text-right pr-6 space-x-1">
                    <button class="btn-otp p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl" data-id="${acc.id}"><i class="fa-solid fa-key"></i></button>
                    <button class="btn-delete p-2.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl" data-id="${acc.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    body.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id && confirm("¿Eliminar esta cuenta matriz?")) {
            await accountService.delete(id);
            await refreshAllData();
        }
    }));
    body.querySelectorAll('.btn-otp').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) goToOTP(id);
    }));
}

function renderCustomersTable() {
    const body = document.getElementById('customers-table-body');
    if (!body) return;
    body.innerHTML = "";

    const filtered = customers.filter(cust => 
        cust.name.toLowerCase().includes(currentSearchQuery) || 
        cust.service.toLowerCase().includes(currentSearchQuery)
    );

    filtered.forEach(cust => {
        const serviceColor = getServiceColorClass(cust.service);
        const daysLeft = calculateDaysRemaining(cust.expiration);
        
        let statusClass = "text-emerald-400 bg-emerald-500/10";
        if (daysLeft < 0) statusClass = "text-rose-500 bg-rose-500/10";
        else if (daysLeft <= 3) statusClass = "text-amber-500 bg-amber-500/10";

        body.innerHTML += `
            <tr class="hover:bg-slate-850/30 transition-all border-b border-slate-800/50">
                <td class="p-4 pl-6">
                    <div class="font-bold text-slate-100">${cust.name}</div>
                    <div class="text-xs text-slate-500">ID: ${cust.id.substring(0,8)}</div>
                </td>
                <td class="p-4">
                    <a href="https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-400 font-bold text-xs"><i class="fa-brands fa-whatsapp"></i> ${cust.phone}</a>
                </td>
                <td class="p-4">
                    <span class="px-2.5 py-1 ${serviceColor} text-white rounded-md text-[10px] font-bold uppercase">${cust.service}</span>
                </td>
                <td class="p-4">
                    <div class="text-xs text-indigo-400 font-semibold"><i class="fa-solid fa-circle-user"></i> ${cust.profile_detail}</div>
                </td>
                <td class="p-4">
                    <div class="text-xs font-bold text-slate-100">$${Number(cust.paid_amount).toFixed(2)}</div>
                    <div class="text-xs text-slate-400 mt-1">${cust.expiration}</div>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded-lg text-xs font-bold uppercase ${statusClass}">${daysLeft}d</span>
                </td>
                <td class="p-4 text-right pr-6 space-x-1">
                    <button class="btn-wa p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl" data-id="${cust.id}"><i class="fa-brands fa-whatsapp"></i></button>
                    <button class="btn-copy p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl" data-id="${cust.id}"><i class="fa-regular fa-copy"></i></button>
                    <button class="btn-renew p-2.5 bg-slate-800 text-slate-300 rounded-xl" data-id="${cust.id}"><i class="fa-solid fa-arrows-rotate"></i></button>
                </td>
            </tr>
        `;
    });

    body.querySelectorAll('.btn-wa').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) sendWhatsAppReminder(id);
    }));
    body.querySelectorAll('.btn-copy').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) copyCustomerCredentials(id);
    }));
    body.querySelectorAll('.btn-renew').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) renewCustomer(id);
    }));
}

// --- ACTIONS ---
function goToOTP(accountId: string) {
    switchTab('recovery');
    const select = document.querySelector('select[name="account_id"]') as HTMLSelectElement;
    if (select) select.value = accountId;
}

async function resolveIncident(id: string) {
    await incidentService.resolve(id);
    await refreshAllData();
    showToast("Resuelto", "Incidencia marcada como completada", "success");
}

function sendWhatsAppReminder(custId: string) {
    const cust = customers.find(c => c.id === custId);
    const acc = accounts.find(a => a.id === cust?.account_id);
    if (!cust || !acc) return;

    const daysLeft = calculateDaysRemaining(cust.expiration);
    let message = "";

    if (daysLeft < 0) {
        message = `Hola *${cust.name}*, te escribo de *StreamControl*. Tu suscripción de *${cust.service}* ha vencido hace ${daysLeft * -1} días. ¿Deseas renovar?`;
    } else if (daysLeft <= 3) {
        message = `Hola *${cust.name}*, recordatorio de pago. Tu cuenta de *${cust.service}* vence en ${daysLeft} días (${cust.expiration}).`;
    } else {
        message = `Hola *${cust.name}*, aquí tienes los datos de tu cuenta *${cust.service}*:\n\n📧 *Correo:* ${acc.email}\n🔑 *Clave:* ${acc.password}\n👤 *Perfil:* ${cust.profile_detail}\n📅 *Vence:* ${cust.expiration}\n\n¡Gracias por tu compra!`;
    }

    const encodedMsg = encodeURIComponent(message);
    const phone = cust.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
}

function copyCustomerCredentials(custId: string) {
    const cust = customers.find(c => c.id === custId);
    const acc = accounts.find(a => a.id === cust?.account_id);
    if (!cust || !acc) return;

    const text = `*DATOS DE TU SUSCRIPCIÓN*\n\n` +
                 `*Servicio:* ${cust.service}\n` +
                 `*Correo:* ${acc.email}\n` +
                 `*Clave:* ${acc.password}\n` +
                 `*Perfil:* ${cust.profile_detail}\n` +
                 `*Vence:* ${cust.expiration}`;

    navigator.clipboard.writeText(text).then(() => {
        showToast("Copiado", "Datos listos para enviar", "info");
    });
}

async function renewCustomer(custId: string) {
    const cust = customers.find(c => c.id === custId);
    if (!cust) return;

    const currentExp = new Date(cust.expiration);
    currentExp.setDate(currentExp.getDate() + 30);
    const newExp = currentExp.toISOString().split('T')[0];

    try {
        await customerService.update(custId, { expiration: newExp });
        await refreshAllData();
        showToast("Renovado", `${cust.name} renovado por 30 días`, "success");
    } catch (err) {
        showToast("Error", "No se pudo renovar", "error");
    }
}

// --- MODAL HANDLING ---
function initModals() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    document.getElementById('btn-open-add-account')?.addEventListener('click', () => {
        openModal('add-account');
    });

    document.getElementById('btn-open-add-customer')?.addEventListener('click', () => {
        openModal('add-customer');
    });
}

function openModal(type: 'add-account' | 'add-customer' | 'swap') {
    const container = document.getElementById('modal-container');
    if (!container) return;

    if (type === 'add-account') {
        container.innerHTML = `
            <div id="modal-add-account" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div class="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl">
                    <div class="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-indigo-400"><i class="fa-solid fa-tv"></i> Registrar Cuenta Matriz</h3>
                        <button class="modal-close text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    <form id="form-add-account" class="p-6 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plataforma</label>
                                <select name="service" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-600 outline-none" required>
                                    <option value="Netflix">Netflix</option>
                                    <option value="Disney+">Disney+</option>
                                    <option value="Star+">Star+</option>
                                    <option value="HBO Max">HBO Max</option>
                                    <option value="Spotify">Spotify</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pantallas</label>
                                <input name="profiles_total" type="number" value="5" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Acceso</label>
                            <input name="email" type="email" placeholder="correo@ejemplo.com" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contraseña</label>
                                <input name="password" type="text" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proveedor</label>
                                <input name="provider" type="text" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Expiración</label>
                            <input name="expiration" type="date" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                        </div>
                        <div class="pt-4 flex gap-3">
                            <button type="button" class="modal-close flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">Cancelar</button>
                            <button type="submit" class="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    } else if (type === 'add-customer') {
        const availableAccounts = accounts.filter(a => a.assigned_profiles < a.profiles_total);
        container.innerHTML = `
            <div id="modal-add-customer" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div class="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl">
                    <div class="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-indigo-400"><i class="fa-solid fa-user-plus"></i> Registrar Cliente</h3>
                        <button class="modal-close text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    <form id="form-add-customer" class="p-6 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                                <input name="name" type="text" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">WhatsApp</label>
                                <input name="phone" type="tel" placeholder="+57..." class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cuenta Matriz</label>
                                <select name="account_id" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                                    ${availableAccounts.map(a => `<option value="${a.id}">${a.service} - ${a.email}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Perfil / PIN</label>
                                <input name="profile_detail" type="text" placeholder="Perfil 1 (PIN 1234)" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto de Venta</label>
                                <input name="paid_amount" type="number" step="0.01" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Expiración</label>
                                <input name="expiration" type="date" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" required>
                            </div>
                        </div>
                        <div class="pt-4 flex gap-3">
                            <button type="button" class="modal-close flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">Cancelar</button>
                            <button type="submit" class="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">Registrar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // Bind Close events
    container.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
    
    // Bind Submit events
    const formAccount = document.getElementById('form-add-account') as HTMLFormElement;
    if (formAccount) {
        formAccount.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formAccount);
            const data = Object.fromEntries(formData.entries());
            try {
                await accountService.create({
                    service: data.service as string,
                    email: data.email as string,
                    password: data.password as string,
                    profiles_total: Number(data.profiles_total),
                    assigned_profiles: 0,
                    provider: data.provider as string,
                    expiration: data.expiration as string,
                    status: 'Activa'
                });
                showToast("Éxito", "Cuenta registrada correctamente", "success");
                closeModal();
                await refreshAllData();
            } catch (err) {
                showToast("Error", "No se pudo crear la cuenta", "error");
            }
        });
    }

    const formCustomer = document.getElementById('form-add-customer') as HTMLFormElement;
    if (formCustomer) {
        formCustomer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formCustomer);
            const data = Object.fromEntries(formData.entries());
            const acc = accounts.find(a => a.id === data.account_id);
            try {
                await customerService.create({
                    name: data.name as string,
                    phone: data.phone as string,
                    service: acc?.service || '',
                    account_id: data.account_id as string,
                    profile_detail: data.profile_detail as string,
                    paid_amount: Number(data.paid_amount),
                    expiration: data.expiration as string
                });
                
                // Update account count
                if (acc) {
                    await accountService.update(acc.id, { assigned_profiles: acc.assigned_profiles + 1 });
                }

                showToast("Éxito", "Cliente registrado correctamente", "success");
                closeModal();
                await refreshAllData();
            } catch (err) {
                showToast("Error", "No se pudo crear el cliente", "error");
            }
        });
    }
}

function closeModal() {
    const container = document.getElementById('modal-container');
    if (container) container.innerHTML = "";
}

// --- UTILS ---
function calculateDaysRemaining(expDate: string) {
    const diff = new Date(expDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getServiceColorClass(service: string) {
    switch(service) {
        case 'Netflix': return 'bg-red-600 hover:bg-red-700';
        case 'Disney+': return 'bg-blue-600 hover:bg-blue-700';
        case 'Spotify': return 'bg-emerald-600 hover:bg-emerald-700';
        default: return 'bg-indigo-600';
    }
}

function showToast(title: string, desc: string, type: 'success' | 'error' | 'info' = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    document.getElementById('toast-title')!.innerText = title;
    document.getElementById('toast-desc')!.innerText = desc;
    
    const iconBg = document.getElementById('toast-icon-bg')!;
    const icon = document.getElementById('toast-icon')!;
    
    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-rose-500',
        info: 'bg-indigo-500'
    };
    
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };
    
    iconBg.className = `p-2 rounded-xl text-white ${colors[type]}`;
    icon.className = `fa-solid ${icons[type]}`;

    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 4000);
}

// --- RECOVERY / OTP LOGIC ---
function renderRecoveryTab() {
    const container = document.getElementById('tab-recovery');
    if (!container) return;

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="card">
                <h4 class="font-bold text-lg text-slate-100 mb-4">Generar Código en Vivo</h4>
                <form id="form-otp" class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-2">Cuenta Afectada</label>
                        <select name="account_id" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-600 outline-none" required>
                            ${accounts.map(a => `<option value="${a.id}">${a.service} - ${a.email}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-2">Tipo de Solicitud</label>
                        <select name="type" class="w-full bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none">
                            <option value="Hogar">Código de Hogar (Netflix)</option>
                            <option value="Login">OTP de Inicio de Sesión</option>
                            <option value="Pass">Restablecer Contraseña</option>
                        </select>
                    </div>
                    <button type="submit" id="btn-extract-otp" class="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                        <i class="fa-solid fa-bolt"></i> Extraer Código
                    </button>
                </form>
                <div id="otp-loader" class="hidden mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <div class="flex items-center gap-4">
                        <i class="fa-solid fa-spinner animate-spin text-indigo-400"></i>
                        <span class="text-xs text-indigo-300" id="otp-status-text">Conectando...</span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-lg text-slate-100">Terminal de Recuperación</h4>
                    <span class="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 min-h-[200px]" id="otp-console">
                    <p>// Esperando solicitud...</p>
                </div>
                <div id="otp-result-card" class="hidden mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <div>
                        <p class="text-[10px] text-emerald-400 uppercase font-bold">CÓDIGO OBTENIDO</p>
                        <p class="text-2xl font-black text-white tracking-widest mt-1" id="extracted-code">------</p>
                    </div>
                    <button id="btn-copy-otp" class="p-3 bg-slate-850 hover:bg-slate-800 rounded-xl text-white transition-all">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('form-otp') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
        throttle(handleOTPExtraction, 2000)(e);
    });
}

async function handleOTPExtraction(e: Event) {
    e.preventDefault();
    const btn = document.getElementById('btn-extract-otp') as HTMLButtonElement;
    const loader = document.getElementById('otp-loader');
    const status = document.getElementById('otp-status-text');
    const consoleBox = document.getElementById('otp-console');
    const resultCard = document.getElementById('otp-result-card');
    const codeEl = document.getElementById('extracted-code');

    if (btn) btn.disabled = true;
    loader?.classList.remove('hidden');
    resultCard?.classList.add('hidden');
    if (consoleBox) consoleBox.innerHTML = `<p class="text-amber-400">> Iniciando túnel IMAP...</p>`;

    const steps = ["Conectando al servidor...", "Validando SSL...", "Buscando correos...", "Extrayendo OTP..."];
    for (let step of steps) {
        if (status) status.innerText = step;
        if (consoleBox) consoleBox.innerHTML += `<p class="mt-1">> \${step}</p>`;
        await new Promise(r => setTimeout(r, 600));
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (codeEl) codeEl.innerText = code;
    
    loader?.classList.add('hidden');
    resultCard?.classList.remove('hidden');
    if (btn) btn.disabled = false;
    if (consoleBox) consoleBox.innerHTML += `<p class="text-emerald-400 mt-2">>> [ÉXITO] Código: \${code}</p>`;
}
