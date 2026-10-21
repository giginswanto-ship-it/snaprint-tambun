// js/app.js - Snaprint Digital Printing Application Controller

(function () {
  'use strict';

  // Application State
  const AppState = {
    data: null,
    activeTab: 'dashboard',
    activeCategoryFilter: 'all',
    searchQuery: '',
    charts: {},
    editingItem: null,
    editingCategory: null,

    isLiveConnected: false,
    sseSource: null,

    currentUser: null,
    selectedRoleKey: 'principal',
    USERS_CONFIG: {
      'principal': {
        username: 'Principal',
        pin: '220717',
        role: 'principal',
        badge: 'Direksi / Super Admin',
        color: 'amber',
        greeting: 'Selamat Datang, Bapak/Ibu Principal! Hak akses penuh manajemen aktif.'
      },
      'prospective buyer': {
        username: 'Prospective Buyer',
        pin: '1234',
        role: 'buyer',
        badge: 'Investor & Mitra Outlet',
        color: 'sky',
        greeting: 'Selamat Datang, Calon Investor Snaprint! Mode prospektus investasi aktif.'
      }
    },

    init() {
      this.initAuth();
      this.loadData();
      this.bindEvents();
      this.render();
      this.initCharts();
      this.setupLiveSync();
      this.applyRolePermissions();
    },

    initAuth() {
      const stored = localStorage.getItem('SNAPRINT_CURRENT_USER');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.username && (parsed.role === 'principal' || parsed.role === 'buyer')) {
            this.currentUser = parsed;
          }
        } catch (e) {
          console.error('Error parsing stored user session:', e);
        }
      }

      // Sync portal controls on init
      if (this.currentUser) {
        this.selectRole(this.currentUser.username, null, false);
      } else {
        this.selectRole('Principal', null, false);
      }
    },

    selectRole(roleName, defaultPin, focusPin = true) {
      const key = (roleName || '').toLowerCase().trim();
      const config = this.USERS_CONFIG[key] || this.USERS_CONFIG['principal'];
      this.selectedRoleKey = config.role === 'buyer' ? 'prospective buyer' : 'principal';

      // Update username input in portal form
      const inputUsername = document.getElementById('input-username');
      if (inputUsername) inputUsername.value = config.username;

      // Update active badge in auth box
      const activeBadge = document.getElementById('active-badge');
      if (activeBadge) {
        activeBadge.innerText = config.username;
        if (config.color === 'amber') {
          activeBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
        } else {
          activeBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30';
        }
      }

      // Update card visual active borders & radios
      const cardPrincipal = document.getElementById('role-card-principal');
      const cardBuyer = document.getElementById('role-card-buyer');
      const radioPrincipal = document.getElementById('radio-principal');
      const radioBuyer = document.getElementById('radio-buyer');

      if (config.role === 'principal') {
        if (cardPrincipal) {
          cardPrincipal.classList.add('border-amber-500', 'ring-2', 'ring-amber-500/20', 'bg-slate-900/90');
          cardPrincipal.classList.remove('border-slate-700/80');
        }
        if (cardBuyer) {
          cardBuyer.classList.remove('border-sky-500', 'ring-2', 'ring-sky-500/20', 'bg-slate-900/90');
          cardBuyer.classList.add('border-slate-700/80');
        }
        if (radioPrincipal) radioPrincipal.innerHTML = '<div class="w-3 h-3 rounded-full bg-amber-400"></div>';
        if (radioBuyer) radioBuyer.innerHTML = '';
      } else {
        if (cardBuyer) {
          cardBuyer.classList.add('border-sky-500', 'ring-2', 'ring-sky-500/20', 'bg-slate-900/90');
          cardBuyer.classList.remove('border-slate-700/80');
        }
        if (cardPrincipal) {
          cardPrincipal.classList.remove('border-amber-500', 'ring-2', 'ring-amber-500/20', 'bg-slate-900/90');
          cardPrincipal.classList.add('border-slate-700/80');
        }
        if (radioBuyer) radioBuyer.innerHTML = '<div class="w-3 h-3 rounded-full bg-sky-400"></div>';
        if (radioPrincipal) radioPrincipal.innerHTML = '';
      }

      const pinInput = document.getElementById('input-pin');
      if (pinInput) {
        pinInput.value = '';
        if (focusPin) pinInput.focus();
      }

      // Update quick pin button display
      const quickPinBtn = document.getElementById('btn-quick-pin');
      if (quickPinBtn) {
        if (config.role === 'principal') {
          quickPinBtn.innerHTML = '<span class="text-amber-400/90 text-[11px] font-semibold flex items-center gap-1 cursor-default"><i class="fa-solid fa-lock text-[10px]"></i> PIN Terproteksi Direksi</span>';
          quickPinBtn.className = 'text-[11px] text-amber-400/90 font-semibold no-underline';
        } else {
          quickPinBtn.innerHTML = 'Isi PIN Otomatis (1234)';
          quickPinBtn.className = 'text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2';
        }
      }

      this.hidePortalError();
    },

    toggleRoleSwitch() {
      if (this.selectedRoleKey === 'principal') {
        this.selectRole('Prospective Buyer');
      } else {
        this.selectRole('Principal');
      }
    },

    autoFillCurrentPin() {
      if (this.selectedRoleKey === 'principal') {
        this.showPortalError('PIN Principal bersifat rahasia dan tidak dimunculkan di portal. Silakan ketik PIN resmi Direksi.');
        return;
      }
      const config = this.USERS_CONFIG[this.selectedRoleKey];
      if (config) {
        const pinInput = document.getElementById('input-pin');
        if (pinInput) {
          pinInput.value = config.pin;
          pinInput.focus();
        }
        this.hidePortalError();
      }
    },

    togglePinVisibility() {
      const pinInput = document.getElementById('input-pin');
      const eyeIcon = document.getElementById('eye-icon');
      if (!pinInput || !eyeIcon) return;

      if (pinInput.type === 'password') {
        pinInput.type = 'text';
        eyeIcon.className = 'fa-solid fa-eye-slash text-xs text-sky-400';
      } else {
        pinInput.type = 'password';
        eyeIcon.className = 'fa-solid fa-eye text-xs text-slate-400';
      }
    },

    pressKeypad(num) {
      const pinInput = document.getElementById('input-pin');
      if (!pinInput) return;
      if (pinInput.value.length < 10) {
        pinInput.value += num;
      }
      this.hidePortalError();
    },

    clearKeypad() {
      const pinInput = document.getElementById('input-pin');
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
      this.hidePortalError();
    },

    backspaceKeypad() {
      const pinInput = document.getElementById('input-pin');
      if (pinInput && pinInput.value.length > 0) {
        pinInput.value = pinInput.value.slice(0, -1);
      }
      this.hidePortalError();
    },

    showPortalError(msg) {
      const errorDiv = document.getElementById('error-message');
      const errorText = document.getElementById('error-text');
      const pinInput = document.getElementById('input-pin');

      if (errorText) errorText.innerText = msg;
      if (errorDiv) {
        errorDiv.classList.remove('hidden');
        errorDiv.classList.remove('animate-shake');
        void errorDiv.offsetWidth;
        errorDiv.classList.add('animate-shake');
      }
      if (pinInput) {
        pinInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/40');
      }
    },

    hidePortalError() {
      const errorDiv = document.getElementById('error-message');
      const pinInput = document.getElementById('input-pin');
      if (errorDiv) errorDiv.classList.add('hidden');
      if (pinInput) {
        pinInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/40');
      }
    },

    handlePortalLogin(e) {
      if (e) e.preventDefault();

      const usernameInput = document.getElementById('input-username');
      const pinInput = document.getElementById('input-pin');
      const submitBtn = document.getElementById('btn-login-submit');
      const submitText = document.getElementById('btn-login-text');

      const rawUser = usernameInput ? usernameInput.value.trim().toLowerCase() : this.selectedRoleKey;
      const enteredPin = pinInput ? pinInput.value.trim() : '';

      const userConfig = this.USERS_CONFIG[rawUser];

      if (!userConfig) {
        this.showPortalError('Profil pengguna tidak valid.');
        return;
      }

      if (!enteredPin) {
        this.showPortalError('Silakan masukkan PIN otentikasi.');
        if (pinInput) pinInput.focus();
        return;
      }

      if (enteredPin !== userConfig.pin) {
        this.showPortalError(`PIN salah untuk username "${userConfig.username}". Silakan coba lagi.`);
        if (pinInput) pinInput.select();
        return;
      }

      // Success
      this.hidePortalError();
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.remove('from-sky-500', 'to-emerald-500');
        submitBtn.classList.add('from-emerald-600', 'to-emerald-500');
      }
      if (submitText) {
        submitText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuka Portal...';
      }

      this.currentUser = {
        username: userConfig.username,
        role: userConfig.role,
        badge: userConfig.badge,
        color: userConfig.color,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('SNAPRINT_CURRENT_USER', JSON.stringify(this.currentUser));

      setTimeout(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.innerText = 'Masuk ke Portal Sistem';
        this.applyRolePermissions();
        this.switchTab('rab-capex');
        this.render();
        this.updateCharts();
        this.showToast(`Selamat datang ${this.currentUser.username}! Akses ${this.currentUser.badge} aktif. Dialihkan ke Halaman 2: RAB Outlet & Modal.`, 'success');
      }, 400);
    },

    logout() {
      this.currentUser = null;
      localStorage.removeItem('SNAPRINT_CURRENT_USER');
      this.applyRolePermissions();
      this.selectRole('Principal', null, true);
      this.showToast('Anda telah keluar dari portal sistem', 'info');
    },

    switchUserModal() {
      const portalOverlay = document.getElementById('portal-landing-page');
      if (portalOverlay) {
        portalOverlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
      const skipBtn = document.getElementById('btn-portal-skip');
      if (skipBtn && this.currentUser) {
        skipBtn.classList.remove('hidden');
      }
    },

    closePortalOverlay() {
      if (!this.currentUser) return;
      const portalOverlay = document.getElementById('portal-landing-page');
      if (portalOverlay) {
        portalOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    },

    isPrincipal() {
      return !!(this.currentUser && this.currentUser.role === 'principal');
    },

    applyRolePermissions() {
      const isPrincipal = this.isPrincipal();
      const isBuyer = !isPrincipal;

      // 1. Investor Banner in Dashboard
      const investorBanner = document.getElementById('investor-welcome-banner');
      if (investorBanner) {
        if (isBuyer) {
          investorBanner.classList.remove('hidden');
        } else {
          investorBanner.classList.add('hidden');
        }
      }

      // 2. Hide or Show Save buttons & Admin buttons (Principal only)
      const saveBtn = document.getElementById('btn-save-changes');
      if (saveBtn) {
        saveBtn.style.display = isPrincipal ? 'inline-flex' : 'none';
      }

      const capexSaveBtn = document.querySelector('#tab-rab-capex button[onclick*="handleManualSave"]');
      if (capexSaveBtn) {
        capexSaveBtn.style.display = isPrincipal ? 'inline-flex' : 'none';
      }

      const addItemBtn = document.getElementById('btn-open-add-item');
      if (addItemBtn) {
        addItemBtn.style.display = isPrincipal ? 'inline-flex' : 'none';
      }

      const resetDataBtn = document.getElementById('btn-reset-data');
      if (resetDataBtn) {
        resetDataBtn.style.display = isPrincipal ? 'flex' : 'none';
      }

      const importJsonBtn = document.getElementById('btn-import-json');
      if (importJsonBtn) {
        importJsonBtn.style.display = isPrincipal ? 'flex' : 'none';
      }

      const dbInspectorHeaderBtns = document.querySelectorAll('header button[onclick*="openDatabaseInspector"]');
      dbInspectorHeaderBtns.forEach(btn => {
        btn.style.display = isPrincipal ? 'inline-flex' : 'none';
      });

      const dbInspectorDropdown = document.querySelector('.group button[onclick*="openDatabaseInspector"]');
      if (dbInspectorDropdown) {
        dbInspectorDropdown.style.display = isPrincipal ? 'flex' : 'none';
      }

      // 3. Global Discount Controls in RAB (Principal only)
      const discType = document.getElementById('rab-global-disc-type');
      const discVal = document.getElementById('rab-global-disc-val');
      const discApplyBtn = document.querySelector('#tab-rab-capex button[onclick*="applyGlobalDiscount"]');
      const discResetBtn = document.querySelector('#tab-rab-capex button[onclick*="resetGlobalDiscount"]');
      if (discType) discType.disabled = !isPrincipal;
      if (discVal) discVal.disabled = !isPrincipal;
      if (discApplyBtn) discApplyBtn.style.display = isPrincipal ? 'inline-block' : 'none';
      if (discResetBtn) discResetBtn.style.display = isPrincipal ? 'inline-block' : 'none';

      // 4. Working Capital Inputs (Principal only)
      const wcRentCost = document.getElementById('wc-rent-cost');
      const wcRentDep = document.getElementById('wc-rent-deposit');
      const wcRunway = document.getElementById('wc-runway-months');
      const wcPetty = document.getElementById('wc-petty-cash');
      if (wcRentCost) wcRentCost.disabled = !isPrincipal;
      if (wcRentDep) wcRentDep.disabled = !isPrincipal;
      if (wcRunway) wcRunway.disabled = !isPrincipal;
      if (wcPetty) wcPetty.disabled = !isPrincipal;

      // 5. Draft MoU Editor Form & Buttons in Halaman 3 (Principal only)
      const mouEditorBtn = document.getElementById('btn-toggle-mou-editor');
      if (mouEditorBtn) {
        mouEditorBtn.style.display = isPrincipal ? 'inline-flex' : 'none';
      }
      const mouEditorCard = document.getElementById('mou-editor-card');
      if (mouEditorCard && !isPrincipal) {
        mouEditorCard.classList.add('hidden');
      }

      // 6. Update User Header Profile badge
      const nameDisp = document.getElementById('user-name-display');
      const avatarIcon = document.getElementById('user-avatar-icon');
      const avatarBadge = document.getElementById('user-avatar-badge');
      const dropdownName = document.getElementById('user-dropdown-name');
      const dropdownRole = document.getElementById('user-dropdown-role');

      if (this.currentUser) {
        if (nameDisp) nameDisp.innerText = this.currentUser.username;
        if (dropdownName) dropdownName.innerText = this.currentUser.username;
        if (dropdownRole) dropdownRole.innerText = this.currentUser.badge;

        if (this.currentUser.role === 'buyer') {
          if (avatarBadge) avatarBadge.className = 'w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]';
          if (avatarIcon) avatarIcon.className = 'fa-solid fa-briefcase text-sky-400';
          if (dropdownRole) dropdownRole.className = 'text-[11px] text-sky-400 font-semibold';
        } else {
          if (avatarBadge) avatarBadge.className = 'w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]';
          if (avatarIcon) avatarIcon.className = 'fa-solid fa-crown text-amber-400';
          if (dropdownRole) dropdownRole.className = 'text-[11px] text-amber-400 font-semibold';
        }
      }

      // 4. Update Portal Overlay visibility
      const portalOverlay = document.getElementById('portal-landing-page');
      if (portalOverlay) {
        if (!this.currentUser) {
          portalOverlay.classList.remove('hidden');
          document.body.classList.add('overflow-hidden');
        } else {
          portalOverlay.classList.add('hidden');
          document.body.classList.remove('overflow-hidden');
        }
      }

      const skipBtn = document.getElementById('btn-portal-skip');
      if (skipBtn) {
        if (this.currentUser) {
          skipBtn.classList.remove('hidden');
        } else {
          skipBtn.classList.add('hidden');
        }
      }
    },

    loadData() {
      // 1. Check embedded window.LIVE_DATABASE (from data/database.js)
      if (window.LIVE_DATABASE && window.LIVE_DATABASE.categories) {
        this.data = JSON.parse(JSON.stringify(window.LIVE_DATABASE));
        console.log('Data loaded from embedded data/database.js');
      }

      // 2. Check LocalStorage if user has local modifications
      const local = localStorage.getItem('SNAPRINT_RAB_DATA_V1');
      if (local) {
        try {
          const parsedLocal = JSON.parse(local);
          if (parsedLocal && parsedLocal.categories) {
            // Check if parsedLocal has item_4_4 (license item) AND item_2_8 (outdoor machine)
            const hasLicenseItem = parsedLocal.categories.some(c => c.items && c.items.some(i => i.id === 'item_4_4' || (i.name && i.name.toLowerCase().includes('lisensi'))));
            const hasOutdoorMachine = parsedLocal.categories.some(c => c.items && c.items.some(i => i.id === 'item_2_8' || (i.name && i.name.toLowerCase().includes('outdoor'))));
            if (hasLicenseItem && hasOutdoorMachine) {
              this.data = parsedLocal;
              console.log('Data loaded from localStorage cache');
            } else if (window.LIVE_DATABASE && window.LIVE_DATABASE.categories) {
              console.log('Detected older localStorage cache lacking newest items; prioritizing updated LIVE_DATABASE');
              this.data = JSON.parse(JSON.stringify(window.LIVE_DATABASE));
              localStorage.setItem('SNAPRINT_RAB_DATA_V1', JSON.stringify(this.data));
            } else {
              this.data = parsedLocal;
            }
          }
        } catch (e) {
          console.error('Error parsing localStorage, using embedded database', e);
        }
      }

      // 3. Fallback to default
      if (!this.data) {
        this.data = JSON.parse(JSON.stringify(window.DEFAULT_RAB_DATA));
      }

      // Ensure discount configuration is initialized
      if (!this.data.discount) {
        this.data.discount = { type: 'nominal', value: 0 };
      }

      // Ensure simulation has dual-engine properties
      if (!this.data.simulation) {
        this.data.simulation = {};
      }
      if (typeof this.data.simulation.dailyOutdoorM2 === 'undefined') {
        this.data.simulation.dailyOutdoorM2 = 35;
        this.data.simulation.outdoorSellPrice = 22000;
        this.data.simulation.outdoorHppCost = 9500;
        this.data.simulation.targetPaybackMonths = 18;
      }

      // 4. If running on HTTP/HTTPS server, fetch live database from server API (MariaDB SQL)
      if (window.location.protocol.startsWith('http')) {
        fetch('/api/database')
          .then(res => {
            const engine = res.headers.get('X-Database-Engine') || '';
            if (engine.includes('MariaDB')) {
              this.dbEngine = 'MariaDB 10.4';
            }
            if (res.ok) return res.json();
            throw new Error('Server returned ' + res.status);
          })
          .then(serverDb => {
            if (serverDb && serverDb.categories) {
              this.data = serverDb;
              this.isLiveConnected = true;
              const badgeText = this.dbEngine ? `LIVE: ${this.dbEngine} (3306)` : 'LIVE: MariaDB (3306)';
              this.updateLiveBadge(true, badgeText);
              this.render();
              this.updateCharts();
              console.log('Live database fetched from /api/database');
            }
          })
          .catch(err => {
            console.log('Running in local offline mode:', err.message);
            this.updateLiveBadge(false, 'LOCAL: data/database.js');
          });
      } else {
        this.updateLiveBadge(false, 'FILE: data/database.js');
      }
    },

    setupLiveSync() {
      if (!window.location.protocol.startsWith('http')) {
        this.updateLiveBadge(false, 'FILE: data/database.js');
        return;
      }

      try {
        if (this.sseSource) {
          this.sseSource.close();
        }

        this.sseSource = new EventSource('/api/database/stream');
        this.sseSource.onopen = () => {
          this.isLiveConnected = true;
          this.updateLiveBadge(true, 'LIVE: data/database.json');
        };

        this.sseSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'database_updated' && payload.data) {
              console.log('[LIVE SSE] Database diperbarui secara real-time dari:', payload.source);
              this.data = payload.data;
              localStorage.setItem('SNAPRINT_RAB_DATA_V1', JSON.stringify(this.data));
              this.render();
              this.updateCharts();
              this.flashLiveBadge();
              this.showToast('Database diperbarui secara live dari server', 'info');
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        };

        this.sseSource.onerror = () => {
          this.isLiveConnected = false;
          this.updateLiveBadge(false, 'OFFLINE (Local Cache)');
        };
      } catch (e) {
        console.warn('SSE not supported or failed:', e);
      }
    },

    updateLiveBadge(isLive, text) {
      const badge = document.getElementById('live-db-status-badge');
      const label = document.getElementById('live-db-status-text');
      const ping = document.getElementById('live-db-ping');
      const dot = document.getElementById('live-db-dot');

      if (!badge || !label) return;

      label.innerText = text;
      if (isLive) {
        badge.className = 'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs shadow-inner cursor-pointer';
        if (ping) ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
        if (dot) dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
      } else {
        badge.className = 'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs shadow-inner cursor-pointer';
        if (ping) ping.className = 'hidden';
        if (dot) dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400';
      }
    },

    flashLiveBadge() {
      const dot = document.getElementById('live-db-dot');
      if (dot) {
        dot.classList.add('scale-150');
        setTimeout(() => dot.classList.remove('scale-150'), 400);
      }
    },

    saveData(notify = true) {
      if (!this.data) return;
      this.data._lastUpdated = new Date().toISOString();
      localStorage.setItem('SNAPRINT_RAB_DATA_V1', JSON.stringify(this.data));

      // Sync to Server API live database file (data/database.json)
      if (window.location.protocol.startsWith('http')) {
        fetch('/api/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data)
        })
        .then(res => res.json())
        .then(resp => {
          this.isLiveConnected = true;
          this.updateLiveBadge(true, 'LIVE: data/database.json');
          this.flashLiveBadge();
          if (notify) {
            this.showToast('Tersimpan live ke data/database.json', 'success');
          }
        })
        .catch(() => {
          this.updateLiveBadge(false, 'LOCAL: data/database.js');
          if (notify) {
            this.showToast('Data tersimpan di penyimpanan lokal browser', 'info');
          }
        });
      } else {
        if (notify) {
          this.showToast('Data tersimpan di penyimpanan browser lokal', 'success');
        }
      }
    },

    resetToDefault() {
      if (confirm('Apakah Anda yakin ingin mengembalikan seluruh data ke standar Dokumen Resmi Snaprint? Data kustom Anda akan direset.')) {
        this.data = JSON.parse(JSON.stringify(window.DEFAULT_RAB_DATA));
        this.saveData(false);
        this.render();
        this.updateCharts();
        this.showToast('Data berhasil dikembalikan ke standar dokumen resmi', 'info');
      }
    },

    switchTab(tabId) {
      this.activeTab = tabId;
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById(`tab-${tabId}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) {
          btn.classList.add('bg-sky-600', 'text-white', 'shadow-md');
          btn.classList.remove('text-slate-600', 'hover:bg-slate-100', 'text-slate-300', 'hover:bg-slate-800');
        } else {
          btn.classList.remove('bg-sky-600', 'text-white', 'shadow-md');
          btn.classList.add('text-slate-600', 'hover:bg-slate-100');
        }
      });

      if (tabId === 'dashboard') {
        this.updateCharts();
      } else if (tabId === 'bep-simulasi') {
        this.renderSimulationOutputs();
        this.updateCharts();
      } else if (tabId === 'dokumen-cetak') {
        this.renderPrintDocument();
      } else if (tabId === 'draft-mou') {
        this.renderMouTab();
      }
    },

    bindEvents() {
      // Tab Navigation
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.switchTab(btn.dataset.tab);
        });
      });

      // Search and Filter in RAB
      const searchInput = document.getElementById('rab-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.renderRabTable();
        });
      }

      const catFilter = document.getElementById('rab-category-filter');
      if (catFilter) {
        catFilter.addEventListener('change', (e) => {
          this.activeCategoryFilter = e.target.value;
          this.renderRabTable();
        });
      }

      // Add Item Modal Buttons
      const btnOpenAddModal = document.getElementById('btn-open-add-item');
      if (btnOpenAddModal) {
        btnOpenAddModal.addEventListener('click', () => this.openItemModal());
      }

      // Modal Form Submit
      const itemForm = document.getElementById('item-modal-form');
      if (itemForm) {
        itemForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveItemFromModal();
        });
      }

      // Reset Button
      const btnReset = document.getElementById('btn-reset-data');
      if (btnReset) {
        btnReset.addEventListener('click', () => this.resetToDefault());
      }

      // Export Buttons
      const btnPrint = document.getElementById('btn-trigger-print');
      if (btnPrint) {
        btnPrint.addEventListener('click', () => {
          this.renderPrintDocument();
          window.print();
        });
      }

      const btnExportCsv = document.getElementById('btn-export-csv');
      if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => this.exportToCsv());
      }

      const btnExportJson = document.getElementById('btn-export-json');
      if (btnExportJson) {
        btnExportJson.addEventListener('click', () => this.exportToJson());
      }

      const btnImportJson = document.getElementById('btn-import-json');
      const fileInputJson = document.getElementById('file-input-json');
      if (btnImportJson && fileInputJson) {
        btnImportJson.addEventListener('click', () => fileInputJson.click());
        fileInputJson.addEventListener('change', (e) => this.importFromJson(e));
      }

      // Keyboard Shortcut Ctrl+S / Cmd+S
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          this.handleManualSave();
        }
      });

      // Dynamic Simulation Inputs
      this.bindSimulationInputs();

      // Dynamic Working Capital Inputs
      this.bindWorkingCapitalInputs();
    },

    handleManualSave() {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal yang memiliki hak simpan database.', 'warning');
        return;
      }
      const saveBtn = document.getElementById('btn-save-changes');
      const saveText = document.getElementById('btn-save-text');
      const saveIcon = saveBtn ? saveBtn.querySelector('i') : null;

      if (saveBtn) {
        saveBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        saveBtn.classList.add('bg-emerald-500', 'ring-2', 'ring-emerald-300');
      }
      if (saveIcon) {
        saveIcon.className = 'fa-solid fa-spinner fa-spin text-xs';
      }
      if (saveText) {
        saveText.innerText = 'Menyimpan...';
      }

      this.saveData(true);

      setTimeout(() => {
        if (saveIcon) {
          saveIcon.className = 'fa-solid fa-check text-xs';
        }
        if (saveText) {
          saveText.innerText = 'Tersimpan!';
        }
        if (saveBtn) {
          saveBtn.classList.remove('bg-emerald-500');
          saveBtn.classList.add('bg-emerald-700');
        }

        setTimeout(() => {
          if (saveIcon) {
            saveIcon.className = 'fa-solid fa-floppy-disk text-xs';
          }
          if (saveText) {
            saveText.innerText = 'Simpan Perubahan';
          }
          if (saveBtn) {
            saveBtn.classList.remove('bg-emerald-700', 'ring-2', 'ring-emerald-300');
            saveBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
          }
        }, 1800);
      }, 300);
    },

    bindSimulationInputs() {
      const inputs = [
        'sim-daily-prints',
        'sim-sell-price',
        'sim-hpp-cost',
        'sim-daily-outdoor',
        'sim-outdoor-price',
        'sim-outdoor-hpp',
        'sim-work-days',
        'sim-other-sales',
        'sim-other-margin',
        'sim-target-payback'
      ];

      inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => {
            this.updateSimulationFromInputs();
          });
          el.addEventListener('change', () => {
            this.updateSimulationFromInputs();
          });
        }
      });
    },

    applyScenarioPreset(scenarioKey) {
      if (!this.data.simulation) return;
      const scenarios = this.data.simulation.scenarios || {
        pesimis: { label: 'Konservatif (Pesimis)', dailyA3Prints: 250, dailyOutdoorM2: 15, monthlyOtherProductsSales: 7000000 },
        moderat: { label: 'Moderat (Target Utama)', dailyA3Prints: 450, dailyOutdoorM2: 35, monthlyOtherProductsSales: 12500000 },
        optimis: { label: 'Optimis (High Demand)', dailyA3Prints: 750, dailyOutdoorM2: 70, monthlyOtherProductsSales: 22000000 }
      };

      const sc = scenarios[scenarioKey];
      if (!sc) return;

      this.data.simulation.activeScenario = scenarioKey;
      this.data.simulation.dailyA3Prints = sc.dailyA3Prints;
      this.data.simulation.dailyOutdoorM2 = sc.dailyOutdoorM2;
      this.data.simulation.monthlyOtherProductsSales = sc.monthlyOtherProductsSales;

      // Update inputs on screen
      const elA3 = document.getElementById('sim-daily-prints');
      if (elA3) elA3.value = sc.dailyA3Prints;
      const elOutdoor = document.getElementById('sim-daily-outdoor');
      if (elOutdoor) elOutdoor.value = sc.dailyOutdoorM2;
      const elOther = document.getElementById('sim-other-sales');
      if (elOther) elOther.value = sc.monthlyOtherProductsSales;

      // Update button highlights
      ['pesimis', 'moderat', 'optimis'].forEach(k => {
        const btn = document.getElementById(`btn-scenario-${k}`);
        if (btn) {
          if (k === scenarioKey) {
            btn.className = 'scenario-btn px-3 py-1.5 rounded-lg text-xs font-bold border border-sky-600 bg-sky-50 text-sky-800 transition-all shadow-sm';
          } else {
            btn.className = 'scenario-btn px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all';
          }
        }
      });

      this.updateSimulationFromInputs();
      this.showToast(`Skenario ${sc.label || scenarioKey} berhasil diterapkan`, 'info');
    },

    bindWorkingCapitalInputs() {
      const runwaySelect = document.getElementById('wc-runway-select');
      if (runwaySelect) {
        runwaySelect.addEventListener('change', (e) => {
          this.data.workingCapital.runwayMonths = parseInt(e.target.value, 10);
          this.saveData(false);
          this.renderModalAwal();
          this.renderDashboardCards();
        });
      }

      const rentInput = document.getElementById('wc-rent-year');
      if (rentInput) {
        rentInput.addEventListener('input', (e) => {
          this.data.workingCapital.rentPerYear = parseFloat(e.target.value) || 0;
          this.saveData(false);
          this.renderModalAwal();
          this.renderDashboardCards();
        });
      }

      const pettyCashInput = document.getElementById('wc-petty-cash');
      if (pettyCashInput) {
        pettyCashInput.addEventListener('input', (e) => {
          this.data.workingCapital.pettyCashBuffer = parseFloat(e.target.value) || 0;
          this.saveData(false);
          this.renderModalAwal();
          this.renderDashboardCards();
        });
      }
    },

    updateSimulationFromInputs() {
      const dailyPrints = parseFloat(document.getElementById('sim-daily-prints')?.value) || 450;
      const sellPrice = parseFloat(document.getElementById('sim-sell-price')?.value) || 5000;
      const hppCost = parseFloat(document.getElementById('sim-hpp-cost')?.value) || 2150;

      const dailyOutdoor = parseFloat(document.getElementById('sim-daily-outdoor')?.value) || 35;
      const outdoorPrice = parseFloat(document.getElementById('sim-outdoor-price')?.value) || 22000;
      const outdoorHpp = parseFloat(document.getElementById('sim-outdoor-hpp')?.value) || 9500;

      const workDays = parseFloat(document.getElementById('sim-work-days')?.value) || 26;
      const otherSales = parseFloat(document.getElementById('sim-other-sales')?.value) || 12500000;
      const otherMargin = parseFloat(document.getElementById('sim-other-margin')?.value) || 55;
      const targetPayback = parseFloat(document.getElementById('sim-target-payback')?.value) || 18;

      if (!this.data.simulation) {
        this.data.simulation = {};
      }

      this.data.simulation.dailyA3Prints = dailyPrints;
      this.data.simulation.a3SellPrice = sellPrice;
      this.data.simulation.a3HppCost = hppCost;
      this.data.simulation.dailyOutdoorM2 = dailyOutdoor;
      this.data.simulation.outdoorSellPrice = outdoorPrice;
      this.data.simulation.outdoorHppCost = outdoorHpp;
      this.data.simulation.workDaysPerMonth = workDays;
      this.data.simulation.monthlyOtherProductsSales = otherSales;
      this.data.simulation.otherProductsMarginPercent = otherMargin;
      this.data.simulation.targetPaybackMonths = targetPayback;

      // Update display tags for sliders
      const sliderValA3 = document.getElementById('sim-daily-prints-val');
      if (sliderValA3) sliderValA3.innerText = `${Calculations.formatNumber(dailyPrints)} lembar/hari`;

      const sliderValOutdoor = document.getElementById('sim-daily-outdoor-val');
      if (sliderValOutdoor) sliderValOutdoor.innerText = `${Calculations.formatNumber(dailyOutdoor)} m²/hari`;

      this.saveData(false);
      this.renderSimulationOutputs();
      this.renderDashboardCards();
      this.updateCharts();
    },

    render() {
      this.renderMetadataHeader();
      this.renderDashboardCards();
      this.renderRabTable();
      this.renderModalAwal();
      this.renderCashflowTermin();
      this.renderSimulationOutputs();
      this.renderPrintDocument();
      this.renderMouTab();
      this.applyRolePermissions();
    },

    renderMetadataHeader() {
      const meta = this.data.meta;
      const elDocNo = document.getElementById('meta-doc-no');
      const elDate = document.getElementById('meta-date');
      const elLocation = document.getElementById('meta-location');
      const elStatus = document.getElementById('meta-status');
      const elDuration = document.getElementById('meta-duration');
      const elArea = document.getElementById('meta-area');
      const elMachine = document.getElementById('meta-machine');

      if (elDocNo) elDocNo.innerText = meta.documentNo;
      if (elDate) elDate.innerText = meta.date;
      if (elLocation) elLocation.innerText = meta.outletLocation;
      if (elStatus) elStatus.innerText = meta.projectStatus;
      if (elDuration) elDuration.innerText = meta.targetDuration;
      if (elArea) elArea.innerText = meta.standardArea;
      if (elMachine) elMachine.innerText = meta.machineModel;
    },

    renderDashboardCards() {
      const capex = Calculations.calculateCapex(this.data);
      const wc = Calculations.calculateWorkingCapital(this.data);
      const modal = Calculations.calculateModalAwal(this.data);
      const sim = Calculations.calculateSimulation(this.data);
      const cashflow = Calculations.calculateCashFlowSchedule(this.data);

      // Total Modal Awal
      const elTotalModal = document.getElementById('dash-total-modal');
      const elCapexTotal = document.getElementById('dash-capex-total');
      const elWcTotal = document.getElementById('dash-wc-total');
      const elBepRevenue = document.getElementById('dash-bep-revenue');
      const elBepSheets = document.getElementById('dash-bep-sheets');
      const elPayback = document.getElementById('dash-payback-period');
      const elMonthlyNetProfit = document.getElementById('dash-monthly-net');
      const elRealizedBar = document.getElementById('dash-realized-progress');
      const elRealizedText = document.getElementById('dash-realized-text');

      if (elTotalModal) elTotalModal.innerText = Calculations.formatRupiah(modal.totalModalAwal);
      if (elCapexTotal) elCapexTotal.innerText = Calculations.formatRupiah(capex.grandTotal);
      if (elWcTotal) elWcTotal.innerText = Calculations.formatRupiah(wc.totalWorkingCapital);
      if (elBepRevenue) elBepRevenue.innerText = Calculations.formatRupiah(sim.bepMonthlyRevenue) + ' / bln';
      if (elBepSheets) elBepSheets.innerText = `A3: ${Math.ceil(sim.bepA3SheetsPerDay)} lbr | Outdoor: ${Math.ceil(sim.bepOutdoorM2PerDay)} m²`;
      
      if (elPayback) {
        if (sim.monthlyNetProfit <= 0) {
          elPayback.innerText = 'Defisit (N/A)';
          elPayback.className = 'text-rose-600 font-bold';
        } else {
          elPayback.innerText = sim.paybackMonthsTotalModal.toFixed(1) + ' Bulan';
          elPayback.className = 'text-emerald-600 font-bold';
        }
      }

      if (elMonthlyNetProfit) {
        elMonthlyNetProfit.innerText = Calculations.formatRupiah(sim.monthlyNetProfit) + ' / bln';
        elMonthlyNetProfit.className = sim.monthlyNetProfit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold';
      }

      if (elRealizedBar && elRealizedText) {
        const pct = capex.realizationPercent.toFixed(1);
        elRealizedBar.style.width = `${pct}%`;
        elRealizedText.innerText = `${pct}% Terbayar (${Calculations.formatRupiah(capex.realizedTotal)} dari ${Calculations.formatRupiah(capex.grandTotal)})`;
      }

      // Executive Dashboard Ratio Banner: % Biaya vs Hasil Bersih
      const elDashOmset = document.getElementById('dash-omset-nominal');
      const elDashNetBadge = document.getElementById('dash-net-profit-pct-badge');
      const elDashBarHpp = document.getElementById('dash-bar-hpp');
      const elDashBarOpex = document.getElementById('dash-bar-opex');
      const elDashBarNet = document.getElementById('dash-bar-net');
      const elDashHppPct = document.getElementById('dash-hpp-pct');
      const elDashHppNom = document.getElementById('dash-hpp-nominal');
      const elDashOpexPct = document.getElementById('dash-opex-pct');
      const elDashOpexNom = document.getElementById('dash-opex-nominal');
      const elDashNetPct = document.getElementById('dash-net-profit-pct');
      const elDashNetNom = document.getElementById('dash-net-profit-nominal');
      const elDashCostTotalNom = document.getElementById('dash-cost-total-nominal');
      const elDashCostTotalPct = document.getElementById('dash-cost-total-pct');
      const elDashNetYield = document.getElementById('dash-net-yield');

      if (elDashOmset) elDashOmset.innerText = Calculations.formatRupiah(sim.totalMonthlyRevenue);
      if (elDashNetBadge) elDashNetBadge.innerText = `${sim.netProfitMarginPercent.toFixed(1)}% / bln`;
      if (elDashBarHpp) elDashBarHpp.style.width = `${Math.max(0, Math.min(100, sim.hppRatioPercent)).toFixed(1)}%`;
      if (elDashBarOpex) elDashBarOpex.style.width = `${Math.max(0, Math.min(100, sim.opexRatioPercent)).toFixed(1)}%`;
      if (elDashBarNet) elDashBarNet.style.width = `${Math.max(0, Math.min(100, sim.netProfitMarginPercent)).toFixed(1)}%`;
      if (elDashHppPct) elDashHppPct.innerText = `${sim.hppRatioPercent.toFixed(1)}%`;
      if (elDashHppNom) elDashHppNom.innerText = Calculations.formatRupiah(sim.totalMonthlyHpp);
      if (elDashOpexPct) elDashOpexPct.innerText = `${sim.opexRatioPercent.toFixed(1)}%`;
      if (elDashOpexNom) elDashOpexNom.innerText = Calculations.formatRupiah(sim.monthlyFixedCost);
      if (elDashNetPct) elDashNetPct.innerText = `${sim.netProfitMarginPercent.toFixed(1)}%`;
      if (elDashNetNom) elDashNetNom.innerText = Calculations.formatRupiah(sim.monthlyNetProfit);
      if (elDashCostTotalNom) elDashCostTotalNom.innerText = Calculations.formatRupiah(sim.totalMonthlyExpense);
      if (elDashCostTotalPct) elDashCostTotalPct.innerText = `${sim.expenseRatioPercent.toFixed(1)}%`;
      if (elDashNetYield) {
        const yieldNom = Math.round((sim.netProfitMarginPercent / 100) * 100000);
        elDashNetYield.innerText = Calculations.formatRupiah(yieldNom);
      }
    },

    renderRabTable() {
      const container = document.getElementById('rab-table-body');
      if (!container) return;

      const capex = Calculations.calculateCapex(this.data);
      let html = '';

      this.data.categories.forEach((cat) => {
        // Check filter
        if (this.activeCategoryFilter !== 'all' && this.activeCategoryFilter !== cat.id) {
          return;
        }

        // Filter items by search
        const filteredItems = cat.items.filter(item => {
          if (!this.searchQuery) return true;
          return item.name.toLowerCase().includes(this.searchQuery) ||
                 item.spec.toLowerCase().includes(this.searchQuery) ||
                 item.code.toLowerCase().includes(this.searchQuery);
        });

        if (filteredItems.length === 0 && this.searchQuery) {
          return;
        }

        // Category Subtotal
        const catSummary = capex.categories.find(c => c.id === cat.id);
        const subtotal = catSummary ? catSummary.subtotal : 0;
        const subtotalGross = catSummary ? catSummary.subtotalGross : 0;
        const subtotalDisc = catSummary ? catSummary.subtotalDiscount : 0;
        const share = catSummary ? catSummary.sharePercent.toFixed(2) : 0;

        // Render Category Header
        html += `
          <tr class="bg-slate-100/90 border-y border-slate-300 font-semibold text-slate-800">
            <td colspan="8" class="py-2.5 px-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-600 text-white text-xs font-bold font-mono">
                    ${cat.code}
                  </span>
                  <span class="text-sm font-bold text-slate-900">${cat.name}</span>
                  <span class="text-xs text-slate-500 font-normal">(${filteredItems.length} item)</span>
                </div>
                <div class="text-right flex items-center gap-3">
                  ${subtotalDisc > 0 ? `<span class="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">Disc: -${Calculations.formatRupiah(subtotalDisc)}</span>` : ''}
                  <span class="text-xs text-slate-500">Porsi: ${share}%</span>
                  <span class="text-sm font-bold text-sky-700">${Calculations.formatRupiah(subtotal)}</span>
                </div>
              </div>
            </td>
          </tr>
        `;

        // Render Items
        filteredItems.forEach((item) => {
          const itemGross = (item.vol || 0) * (item.price || 0);
          const itemDisc = Math.min(itemGross, Math.max(0, parseFloat(item.discount || 0)));
          const itemNet = Math.max(0, itemGross - itemDisc);

          let statusBadge = '';
          if (item.status === 'purchased') {
            statusBadge = '<span class="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">Lunas/Terpasang</span>';
          } else if (item.status === 'in_progress') {
            statusBadge = '<span class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">Proses DP (50%)</span>';
          } else {
            statusBadge = '<span class="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">Belum Direalisasi</span>';
          }

          const isPrincipal = this.isPrincipal();
          const isBuyer = !isPrincipal;

          const statusControl = isBuyer ? statusBadge : `
            <select class="item-status-select text-xs rounded border-slate-300 bg-white py-1 px-1.5 focus:ring-sky-500 focus:border-sky-500" data-cat-id="${cat.id}" data-item-id="${item.id}">
              <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Menunggu</option>
              <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>Proses DP</option>
              <option value="purchased" ${item.status === 'purchased' ? 'selected' : ''}>Lunas/Selesai</option>
            </select>
          `;

          const actionControl = isBuyer ? `
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <i class="fa-solid fa-check text-emerald-500"></i> Terverifikasi
            </span>
          ` : `
            <div class="flex items-center justify-center gap-1.5">
              <button class="btn-edit-item p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded" title="Edit Item" data-cat-id="${cat.id}" data-item-id="${item.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </button>
              <button class="btn-delete-item p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded" title="Hapus Item" data-cat-id="${cat.id}" data-item-id="${item.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          `;

          html += `
            <tr class="hover:bg-slate-50/80 border-b border-slate-200 transition-colors">
              <td class="py-3 px-3 text-center text-xs font-mono font-medium text-slate-500">${item.code}</td>
              <td class="py-3 px-3">
                <div class="font-semibold text-sm text-slate-900">${item.name}</div>
                <div class="text-xs text-slate-500 line-clamp-2 mt-0.5">${item.spec || '-'}</div>
                ${item.notes ? `<div class="text-[11px] text-sky-600 mt-1 italic"><i class="fa-solid fa-circle-info mr-1"></i>${item.notes}</div>` : ''}
              </td>
              <td class="py-3 px-3 text-center">
                <span class="font-mono text-xs font-semibold text-slate-800">${item.vol}</span>
                <span class="text-xs text-slate-500">${item.sat}</span>
              </td>
              <td class="py-3 px-3 text-right font-mono text-xs text-slate-700">
                ${Calculations.formatRupiah(item.price)}
              </td>
              <td class="py-3 px-3 text-right font-mono text-xs">
                ${itemDisc > 0 ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">- ${Calculations.formatRupiah(itemDisc)}</span>` : `<span class="text-slate-400">-</span>`}
              </td>
              <td class="py-3 px-3 text-right font-mono text-sm font-bold text-slate-900">
                ${Calculations.formatRupiah(itemNet)}
              </td>
              <td class="py-3 px-3 text-center">
                ${statusControl}
              </td>
              <td class="py-3 px-3 text-center whitespace-nowrap">
                ${actionControl}
              </td>
            </tr>
          `;
        });
      });

      if (!html) {
        html = `
          <tr>
            <td colspan="8" class="py-12 text-center text-slate-500">
              <svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Tidak ada item yang sesuai dengan pencarian atau filter.
            </td>
          </tr>
        `;
      }

      container.innerHTML = html;

      // Update Summary footer in table
      const elGrossTotal = document.getElementById('rab-gross-total');
      const elDiscTotal = document.getElementById('rab-disc-total');
      const elDiscPct = document.getElementById('rab-disc-pct-label');
      const elGrandTotal = document.getElementById('rab-grand-total');

      if (elGrossTotal) elGrossTotal.innerText = Calculations.formatRupiah(capex.totalGross);
      if (elDiscTotal) elDiscTotal.innerText = capex.totalDiscount > 0 ? `- ${Calculations.formatRupiah(capex.totalDiscount)}` : 'Rp 0';
      if (elDiscPct) elDiscPct.innerText = `(${capex.discountPercent.toFixed(1)}% Hemat)`;
      if (elGrandTotal) elGrandTotal.innerText = Calculations.formatRupiah(capex.grandTotal);

      // Sync Global Discount inputs if present
      if (this.data.discount) {
        const elType = document.getElementById('rab-global-disc-type');
        const elVal = document.getElementById('rab-global-disc-val');
        const elBadge = document.getElementById('rab-disc-badge-active');
        if (elType && this.data.discount.type) elType.value = this.data.discount.type;
        if (elVal && this.data.discount.value !== undefined) elVal.value = this.data.discount.value;
        if (elBadge) {
          if (this.data.discount.enabled && this.data.discount.value > 0) {
            elBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
            elBadge.innerText = this.data.discount.type === 'percent' ? `${this.data.discount.value}% Aktif` : `${Calculations.formatRupiah(this.data.discount.value)} Aktif`;
          } else {
            elBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300';
            elBadge.innerText = 'Non-Aktif';
          }
        }
      }

      // Bind dynamic row events
      container.querySelectorAll('.item-status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const catId = e.target.dataset.catId;
          const itemId = e.target.dataset.itemId;
          const cat = this.data.categories.find(c => c.id === catId);
          if (cat) {
            const item = cat.items.find(i => i.id === itemId);
            if (item) {
              item.status = e.target.value;
              this.saveData(false);
              this.renderDashboardCards();
            }
          }
        });
      });

      container.querySelectorAll('.btn-edit-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const catId = btn.dataset.catId;
          const itemId = btn.dataset.itemId;
          this.openItemModal(catId, itemId);
        });
      });

      container.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const catId = btn.dataset.catId;
          const itemId = btn.dataset.itemId;
          this.deleteItem(catId, itemId);
        });
      });
    },

    renderModalAwal() {
      const modal = Calculations.calculateModalAwal(this.data);
      const wc = Calculations.calculateWorkingCapital(this.data);
      const capex = Calculations.calculateCapex(this.data);

      // Update summary cards
      const elCapexPart = document.getElementById('ma-capex-val');
      const elCapexPct = document.getElementById('ma-capex-pct');
      const elWcPart = document.getElementById('ma-wc-val');
      const elWcPct = document.getElementById('ma-wc-pct');
      const elGrandPart = document.getElementById('ma-grand-val');

      if (elCapexPart) elCapexPart.innerText = Calculations.formatRupiah(modal.capexTotal);
      if (elCapexPct) elCapexPct.innerText = modal.capexPercent.toFixed(1) + '% dari Total Modal';
      if (elWcPart) elWcPart.innerText = Calculations.formatRupiah(modal.workingCapitalTotal);
      if (elWcPct) elWcPct.innerText = modal.workingCapitalPercent.toFixed(1) + '% dari Total Modal';
      if (elGrandPart) elGrandPart.innerText = Calculations.formatRupiah(modal.totalModalAwal);

      // Render Salaries Table
      const salContainer = document.getElementById('wc-salaries-table');
      if (salContainer) {
        let salHtml = '';
        this.data.workingCapital.salaries.forEach((s, idx) => {
          const subtotalMonth = (s.count || 0) * (s.salaryPerMonth || 0);
          const subtotalRunway = subtotalMonth * wc.runwayMonths;
          salHtml += `
            <tr class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-2.5 px-3 font-medium text-slate-800">${s.position}</td>
              <td class="py-2.5 px-3 text-center">
                ${this.isPrincipal() ? `
                  <input type="number" min="1" max="10" class="w-16 text-center border rounded py-1 px-1.5 text-xs font-mono staff-count-input" data-id="${s.id}" value="${s.count}">
                ` : `
                  <span class="font-mono text-xs font-bold text-slate-700">${s.count} Orang</span>
                `}
              </td>
              <td class="py-2.5 px-3 text-right">
                ${this.isPrincipal() ? `
                  <input type="number" step="50000" min="0" class="w-32 text-right border rounded py-1 px-1.5 text-xs font-mono staff-salary-input" data-id="${s.id}" value="${s.salaryPerMonth}">
                ` : `
                  <span class="font-mono text-xs font-bold text-slate-700">${Calculations.formatRupiah(s.salaryPerMonth)}</span>
                `}
              </td>
              <td class="py-2.5 px-3 text-right font-mono text-xs font-bold text-slate-900">
                ${Calculations.formatRupiah(subtotalMonth)}
              </td>
              <td class="py-2.5 px-3 text-right font-mono text-xs font-bold text-sky-700 bg-sky-50/50">
                ${Calculations.formatRupiah(subtotalRunway)}
              </td>
            </tr>
          `;
        });
        salContainer.innerHTML = salHtml;

        // Bind salary input changes
        salContainer.querySelectorAll('.staff-count-input').forEach(input => {
          input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const staff = this.data.workingCapital.salaries.find(s => s.id === id);
            if (staff) {
              staff.count = parseInt(e.target.value, 10) || 1;
              this.saveData(false);
              this.renderModalAwal();
              this.renderDashboardCards();
            }
          });
        });

        salContainer.querySelectorAll('.staff-salary-input').forEach(input => {
          input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const staff = this.data.workingCapital.salaries.find(s => s.id === id);
            if (staff) {
              staff.salaryPerMonth = parseFloat(e.target.value) || 0;
              this.saveData(false);
              this.renderModalAwal();
              this.renderDashboardCards();
            }
          });
        });
      }

      // Render Utilities Table
      const utlContainer = document.getElementById('wc-utilities-table');
      if (utlContainer) {
        let utlHtml = '';
        this.data.workingCapital.utilities.forEach((u) => {
          const subtotalRunway = (u.costPerMonth || 0) * wc.runwayMonths;
          utlHtml += `
            <tr class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-2.5 px-3 font-medium text-slate-800">${u.name}</td>
              <td class="py-2.5 px-3 text-right">
                ${this.isPrincipal() ? `
                  <input type="number" step="50000" min="0" class="w-32 text-right border rounded py-1 px-1.5 text-xs font-mono utl-cost-input" data-id="${u.id}" value="${u.costPerMonth}">
                ` : `
                  <span class="font-mono text-xs font-bold text-slate-700">${Calculations.formatRupiah(u.costPerMonth)}</span>
                `}
              </td>
              <td class="py-2.5 px-3 text-right font-mono text-xs font-bold text-sky-700 bg-sky-50/50">
                ${Calculations.formatRupiah(subtotalRunway)}
              </td>
            </tr>
          `;
        });
        utlContainer.innerHTML = utlHtml;

        utlContainer.querySelectorAll('.utl-cost-input').forEach(input => {
          input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const utl = this.data.workingCapital.utilities.find(u => u.id === id);
            if (utl) {
              utl.costPerMonth = parseFloat(e.target.value) || 0;
              this.saveData(false);
              this.renderModalAwal();
              this.renderDashboardCards();
            }
          });
        });
      }

      // Render Scenarios Cards
      const sc = modal.scenarios;
      const elScMin = document.getElementById('sc-min-total');
      const elScMod = document.getElementById('sc-mod-total');
      const elScSafe = document.getElementById('sc-safe-total');

      if (elScMin) elScMin.innerText = Calculations.formatRupiah(sc.minimal.total);
      if (elScMod) elScMod.innerText = Calculations.formatRupiah(sc.moderat.total);
      if (elScSafe) elScSafe.innerText = Calculations.formatRupiah(sc.konservatif.total);
    },

    renderCashflowTermin() {
      const container = document.getElementById('termin-schedule-cards');
      if (!container) return;

      const cf = Calculations.calculateCashFlowSchedule(this.data);
      let html = '';

      cf.schedule.forEach((term, idx) => {
        let badgeColor = 'bg-slate-100 text-slate-600';
        let statusText = 'Menunggu';
        let borderClass = 'border-slate-200';

        if (term.status === 'done') {
          badgeColor = 'bg-emerald-100 text-emerald-800';
          statusText = 'Lunas';
          borderClass = 'border-emerald-300 ring-1 ring-emerald-300';
        } else if (term.status === 'in_progress') {
          badgeColor = 'bg-amber-100 text-amber-800';
          statusText = 'Sedang Berjalan';
          borderClass = 'border-amber-300 ring-1 ring-amber-300';
        }

        html += `
          <div class="bg-white rounded-xl p-5 border ${borderClass} shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                ${term.termin} (${term.week})
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor}">
                ${statusText}
              </span>
            </div>

            <div class="mb-3">
              <div class="text-xs text-slate-500 uppercase font-semibold">Alokasi & Nominal</div>
              <div class="text-xl font-bold font-mono text-slate-900 mt-0.5">
                ${Calculations.formatRupiah(term.calculatedNominal)}
              </div>
              <div class="text-xs font-medium text-slate-500 mt-0.5">Porsi Anggaran: ${term.sharePercent}%</div>
            </div>

            <div class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-4 min-h-[50px]">
              <strong class="text-slate-900 block mb-1">Fokus Pengeluaran:</strong>
              ${term.focus}
            </div>

            <div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <select class="termin-status-select text-xs rounded border-slate-300 bg-white py-1.5 px-2 focus:ring-sky-500 focus:border-sky-500 w-full" data-index="${idx}">
                <option value="pending" ${term.status === 'pending' ? 'selected' : ''}>Menunggu Pencairan</option>
                <option value="in_progress" ${term.status === 'in_progress' ? 'selected' : ''}>Sedang Diproses (Aktif)</option>
                <option value="done" ${term.status === 'done' ? 'selected' : ''}>Sudah Lunas / Selesai</option>
              </select>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Bind termin status select
      container.querySelectorAll('.termin-status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          this.data.cashFlowSchedule[idx].status = e.target.value;
          this.saveData(false);
          this.renderCashflowTermin();
          this.renderDashboardCards();
        });
      });
    },

    renderSimulationOutputs() {
      const sim = Calculations.calculateSimulation(this.data);

      // Populate input controls with current state if not actively focused
      const elA3 = document.getElementById('sim-daily-prints');
      if (elA3 && document.activeElement !== elA3) elA3.value = sim.dailyA3;
      const elA3Val = document.getElementById('sim-daily-prints-val');
      if (elA3Val) elA3Val.innerText = `${Calculations.formatNumber(sim.dailyA3)} lembar/hari`;

      const elSellA3 = document.getElementById('sim-sell-price');
      if (elSellA3 && document.activeElement !== elSellA3) elSellA3.value = sim.a3Price;
      const elHppA3 = document.getElementById('sim-hpp-cost');
      if (elHppA3 && document.activeElement !== elHppA3) elHppA3.value = sim.a3Hpp;

      const elOutdoor = document.getElementById('sim-daily-outdoor');
      if (elOutdoor && document.activeElement !== elOutdoor) elOutdoor.value = sim.dailyOutdoorM2;
      const elOutdoorVal = document.getElementById('sim-daily-outdoor-val');
      if (elOutdoorVal) elOutdoorVal.innerText = `${Calculations.formatNumber(sim.dailyOutdoorM2)} m²/hari`;

      const elOutdoorPrice = document.getElementById('sim-outdoor-price');
      if (elOutdoorPrice && document.activeElement !== elOutdoorPrice) elOutdoorPrice.value = sim.outdoorPrice;
      const elOutdoorHpp = document.getElementById('sim-outdoor-hpp');
      if (elOutdoorHpp && document.activeElement !== elOutdoorHpp) elOutdoorHpp.value = sim.outdoorHpp;

      const elOtherSales = document.getElementById('sim-other-sales');
      if (elOtherSales && document.activeElement !== elOtherSales) elOtherSales.value = sim.revenueOther;
      const elOtherMargin = document.getElementById('sim-other-margin');
      if (elOtherMargin && document.activeElement !== elOtherMargin) elOtherMargin.value = sim.otherMarginPct;

      const elWorkDays = document.getElementById('sim-work-days');
      if (elWorkDays && document.activeElement !== elWorkDays) elWorkDays.value = sim.workDays;

      const elTargetPayback = document.getElementById('sim-target-payback');
      if (elTargetPayback && document.activeElement !== elTargetPayback) elTargetPayback.value = sim.targetPaybackMonths;

      // 5 Highlight Results
      const elTotalRev = document.getElementById('sim-out-total-rev');
      const elGrossMarginPct = document.getElementById('sim-out-gross-pct');
      const elTotalCost = document.getElementById('sim-out-total-cost');
      const elCostPct = document.getElementById('sim-out-cost-pct');
      const elNetProfit = document.getElementById('sim-out-net-profit');
      const elNetMarginPct = document.getElementById('sim-out-net-pct');
      const elPaybackTotal = document.getElementById('sim-out-payback-total');
      const elPaybackCapex = document.getElementById('sim-out-payback-capex');
      const elRoi = document.getElementById('sim-out-roi');
      const elAnnualProfit = document.getElementById('sim-out-annual-profit');

      if (elTotalRev) elTotalRev.innerText = Calculations.formatRupiah(sim.totalMonthlyRevenue);
      if (elGrossMarginPct) elGrossMarginPct.innerText = `${sim.grossMarginPercent.toFixed(1)}% Margin Kotor`;
      if (elTotalCost) elTotalCost.innerText = Calculations.formatRupiah(sim.totalMonthlyExpense);
      if (elCostPct) elCostPct.innerText = `${sim.expenseRatioPercent.toFixed(1)}% Rasio Biaya`;
      if (elNetProfit) elNetProfit.innerText = Calculations.formatRupiah(sim.monthlyNetProfit);
      if (elNetMarginPct) elNetMarginPct.innerText = `${sim.netProfitMarginPercent.toFixed(1)}% Net Margin`;
      if (elPaybackTotal) elPaybackTotal.innerText = sim.monthlyNetProfit > 0 ? `${sim.paybackMonthsTotalModal.toFixed(1)} Bulan` : 'N/A (Defisit)';
      if (elPaybackCapex) elPaybackCapex.innerText = sim.monthlyNetProfit > 0 ? `CAPEX: ${sim.paybackMonthsCapexOnly.toFixed(1)} Bulan` : 'CAPEX: N/A';
      if (elRoi) elRoi.innerText = `${sim.annualRoiPercent.toFixed(1)}% / Thn`;
      if (elAnnualProfit) elAnnualProfit.innerText = `${Calculations.formatRupiah(sim.annualNetProfit)} / Thn`;

      // Panel Analisis Struktur Biaya & Hasil Bersih
      const elBreakdownRev = document.getElementById('sim-breakdown-rev-text');
      const elBreakdownBadge = document.getElementById('sim-breakdown-summary-badge');
      const elBreakdownBarHpp = document.getElementById('sim-breakdown-bar-hpp');
      const elBreakdownBarOpex = document.getElementById('sim-breakdown-bar-opex');
      const elBreakdownBarNet = document.getElementById('sim-breakdown-bar-net');
      const elBreakdownHppPct = document.getElementById('sim-breakdown-hpp-pct');
      const elBreakdownHppNom = document.getElementById('sim-breakdown-hpp-nominal');
      const elBreakdownOpexPct = document.getElementById('sim-breakdown-opex-pct');
      const elBreakdownOpexNom = document.getElementById('sim-breakdown-opex-nominal');
      const elBreakdownCostPct = document.getElementById('sim-breakdown-total-cost-pct');
      const elBreakdownCostNom = document.getElementById('sim-breakdown-total-cost-nominal');
      const elBreakdownNetPct = document.getElementById('sim-breakdown-net-pct');
      const elBreakdownNetNom = document.getElementById('sim-breakdown-net-nominal');
      const elBreakdownSummaryText = document.getElementById('sim-breakdown-summary-text');

      if (elBreakdownRev) elBreakdownRev.innerText = Calculations.formatRupiah(sim.totalMonthlyRevenue);
      if (elBreakdownBadge) elBreakdownBadge.innerText = `Margin Bersih: ${sim.netProfitMarginPercent.toFixed(1)}%`;
      if (elBreakdownBarHpp) elBreakdownBarHpp.style.width = `${Math.max(0, Math.min(100, sim.hppRatioPercent)).toFixed(1)}%`;
      if (elBreakdownBarOpex) elBreakdownBarOpex.style.width = `${Math.max(0, Math.min(100, sim.opexRatioPercent)).toFixed(1)}%`;
      if (elBreakdownBarNet) elBreakdownBarNet.style.width = `${Math.max(0, Math.min(100, sim.netProfitMarginPercent)).toFixed(1)}%`;
      if (elBreakdownHppPct) elBreakdownHppPct.innerText = `${sim.hppRatioPercent.toFixed(1)}%`;
      if (elBreakdownHppNom) elBreakdownHppNom.innerText = Calculations.formatRupiah(sim.totalMonthlyHpp);
      if (elBreakdownOpexPct) elBreakdownOpexPct.innerText = `${sim.opexRatioPercent.toFixed(1)}%`;
      if (elBreakdownOpexNom) elBreakdownOpexNom.innerText = Calculations.formatRupiah(sim.monthlyFixedCost);
      if (elBreakdownCostPct) elBreakdownCostPct.innerText = `${sim.expenseRatioPercent.toFixed(1)}%`;
      if (elBreakdownCostNom) elBreakdownCostNom.innerText = Calculations.formatRupiah(sim.totalMonthlyExpense);
      if (elBreakdownNetPct) elBreakdownNetPct.innerText = `${sim.netProfitMarginPercent.toFixed(1)}%`;
      if (elBreakdownNetNom) elBreakdownNetNom.innerText = Calculations.formatRupiah(sim.monthlyNetProfit);
      if (elBreakdownSummaryText) {
        const costPer100k = Math.round((sim.expenseRatioPercent / 100) * 100000);
        const netPer100k = Math.round((sim.netProfitMarginPercent / 100) * 100000);
        elBreakdownSummaryText.innerHTML = `Dari setiap <strong>Rp 100.000</strong> penjualan, dialokasikan untuk total biaya operasional <strong>${Calculations.formatRupiah(costPer100k)} (${sim.expenseRatioPercent.toFixed(1)}%)</strong> dan menghasilkan laba bersih <strong>${Calculations.formatRupiah(netPer100k)} (${sim.netProfitMarginPercent.toFixed(1)}%)</strong>.`;
      }

      // Target BEP Gap & Status
      const elReqProfit = document.getElementById('sim-target-required-profit');
      const elReqRev = document.getElementById('sim-target-required-rev');
      const elBadge = document.getElementById('sim-target-badge');
      const elProgText = document.getElementById('sim-target-progress-text');
      const elProgBar = document.getElementById('sim-target-progress-bar');

      if (elReqProfit) elReqProfit.innerText = `${Calculations.formatRupiah(sim.requiredMonthlyNetProfit)} / bulan`;
      if (elReqRev) elReqRev.innerText = `${Calculations.formatRupiah(sim.targetMonthlyRevenue)} / bulan`;

      if (elBadge) {
        if (sim.isTargetAchieved) {
          elBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
          elBadge.innerText = 'Target Tercapai & Surplus';
        } else if (sim.targetAchievementPercent >= 80) {
          elBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300';
          elBadge.innerText = `Mendekati (${sim.targetAchievementPercent.toFixed(0)}%)`;
        } else {
          elBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300';
          elBadge.innerText = `Perlu Tambahan Omset (${sim.targetAchievementPercent.toFixed(0)}%)`;
        }
      }

      if (elProgText) elProgText.innerText = `${Math.min(200, Math.max(0, sim.targetAchievementPercent)).toFixed(0)}% Ketercapaian`;
      if (elProgBar) {
        const barW = Math.min(100, Math.max(5, sim.targetAchievementPercent));
        elProgBar.style.width = `${barW}%`;
        elProgBar.className = sim.isTargetAchieved ? 'h-full bg-emerald-500 rounded-full transition-all duration-300' : 'h-full bg-amber-500 rounded-full transition-all duration-300';
      }

      // Operational BEP Indicators
      const elFixedCostDisplay = document.getElementById('sim-fixed-cost-display');
      const elBepRev = document.getElementById('sim-out-bep-rev');
      const elBepSheets = document.getElementById('sim-out-bep-sheets');
      const elBepOutdoor = document.getElementById('sim-out-bep-outdoor');

      if (elFixedCostDisplay) elFixedCostDisplay.innerText = Calculations.formatRupiah(sim.monthlyFixedCost);
      if (elBepRev) elBepRev.innerText = Calculations.formatRupiah(sim.bepMonthlyRevenue);
      if (elBepSheets) elBepSheets.innerText = `${Math.ceil(sim.bepA3SheetsPerDay)} lembar/hari`;
      if (elBepOutdoor) elBepOutdoor.innerText = `${Math.ceil(sim.bepOutdoorM2PerDay)} m²/hari`;

      // 12-Month Table
      const tableBody = document.getElementById('sim-projections-table-body');
      if (tableBody) {
        let rows = '';
        sim.monthlyProjections.forEach(p => {
          const cumColor = p.cumulativeCashflow >= 0 ? 'text-emerald-600 font-bold' : 'text-slate-600';
          rows += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
              <td class="py-2 px-2.5 font-semibold text-slate-800 whitespace-nowrap">${p.month} <span class="text-[10px] text-slate-400 font-normal">(${p.factor}%)</span></td>
              <td class="py-2 px-2.5 text-right font-mono text-slate-700">${Calculations.formatRupiah(p.revA3)}</td>
              <td class="py-2 px-2.5 text-right font-mono text-slate-700">${Calculations.formatRupiah(p.revOutdoor)}</td>
              <td class="py-2 px-2.5 text-right font-mono font-bold text-sky-950 bg-sky-50/50">${Calculations.formatRupiah(p.revenue)}</td>
              <td class="py-2 px-2.5 text-right font-mono text-rose-700 font-medium">${Calculations.formatRupiah(p.totalCost)}</td>
              <td class="py-2 px-2.5 text-right font-mono text-rose-800 font-bold bg-rose-50/40">${p.costPercent.toFixed(1)}%</td>
              <td class="py-2 px-2.5 text-right font-mono font-bold ${p.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${Calculations.formatRupiah(p.netProfit)}</td>
              <td class="py-2 px-2.5 text-right font-mono font-bold bg-emerald-50/40 ${p.netMarginPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${p.netMarginPercent.toFixed(1)}%</td>
              <td class="py-2 px-2.5 text-right font-mono font-semibold text-slate-800">${Calculations.formatRupiah(p.cashBalance)}</td>
              <td class="py-2 px-2.5 text-right font-mono ${cumColor}">${Calculations.formatRupiah(p.cumulativeCashflow)}</td>
            </tr>
          `;
        });
        tableBody.innerHTML = rows;
      }

      // Multi-Year Summary Cards
      const elMyY1Rev = document.getElementById('sim-my-y1-rev');
      const elMyY1Net = document.getElementById('sim-my-y1-net');
      const elMyY2Rev = document.getElementById('sim-my-y2-rev');
      const elMyY2Net = document.getElementById('sim-my-y2-net');
      const elMyY3Rev = document.getElementById('sim-my-y3-rev');
      const elMyY3Net = document.getElementById('sim-my-y3-net');
      const elMyTotal = document.getElementById('sim-my-3y-total-profit');

      if (sim.multiYear) {
        if (elMyY1Rev) elMyY1Rev.innerText = Calculations.formatRupiah(sim.multiYear.year1.revenue);
        if (elMyY1Net) elMyY1Net.innerText = `+${Calculations.formatRupiah(sim.multiYear.year1.netProfit)}`;
        if (elMyY2Rev) elMyY2Rev.innerText = Calculations.formatRupiah(sim.multiYear.year2.revenue);
        if (elMyY2Net) elMyY2Net.innerText = `+${Calculations.formatRupiah(sim.multiYear.year2.netProfit)}`;
        if (elMyY3Rev) elMyY3Rev.innerText = Calculations.formatRupiah(sim.multiYear.year3.revenue);
        if (elMyY3Net) elMyY3Net.innerText = `+${Calculations.formatRupiah(sim.multiYear.year3.netProfit)}`;
        if (elMyTotal) elMyTotal.innerText = `+${Calculations.formatRupiah(sim.multiYear.total3YearsProfit)}`;
      }
    },

    initCharts() {
      // 1. Capex Donut Chart
      const ctxCapex = document.getElementById('chart-capex-donut');
      if (ctxCapex) {
        const capex = Calculations.calculateCapex(this.data);
        this.charts.capex = new Chart(ctxCapex, {
          type: 'doughnut',
          data: {
            labels: capex.categories.map(c => c.name),
            datasets: [{
              data: capex.categories.map(c => c.subtotal),
              backgroundColor: ['#0284c7', '#2563eb', '#f59e0b', '#10b981', '#8b5cf6'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${Calculations.formatRupiah(ctx.parsed)}`
                }
              }
            },
            cutout: '68%'
          }
        });
      }

      // 2. Modal Awal Composition Donut
      const ctxModal = document.getElementById('chart-modal-composition');
      if (ctxModal) {
        const modal = Calculations.calculateModalAwal(this.data);
        this.charts.modal = new Chart(ctxModal, {
          type: 'pie',
          data: {
            labels: ['Investasi Aset Fisik (CAPEX)', 'Modal Kerja Cadangan (Working Capital)'],
            datasets: [{
              data: [modal.capexTotal, modal.workingCapitalTotal],
              backgroundColor: ['#0284c7', '#10b981'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${Calculations.formatRupiah(ctx.parsed)}`
                }
              }
            }
          }
        });
      }

      // 3. 12-Month Cumulative Cashflow Line Chart on Dashboard
      const ctxCashflow = document.getElementById('chart-cumulative-cashflow');
      if (ctxCashflow) {
        const sim = Calculations.calculateSimulation(this.data);
        this.charts.cashflow = new Chart(ctxCashflow, {
          type: 'line',
          data: {
            labels: sim.monthlyProjections.map(p => p.month),
            datasets: [{
              label: 'Arus Kas Kumulatif (Rp)',
              data: sim.monthlyProjections.map(p => p.cumulativeCashflow),
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: '#0284c7'
            }, {
              label: 'Garis Impas (Titik Nol)',
              data: new Array(12).fill(0),
              borderColor: '#ef4444',
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                ticks: {
                  callback: (val) => Calculations.formatNumber(val / 1000000) + ' Jt'
                }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${Calculations.formatRupiah(ctx.parsed.y)}`
                }
              }
            }
          }
        });
      }

      // 4. BEP CVP Line Chart in Tab 5
      const ctxBep = document.getElementById('chart-bep-cvp');
      if (ctxBep) {
        const sim = Calculations.calculateSimulation(this.data);
        const steps = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
        const labels = ['0%', '25%', '50%', '75%', '100%', '125%', '150%'];
        const fixedCosts = steps.map(() => sim.monthlyFixedCost);
        const totalCosts = steps.map(s => sim.monthlyFixedCost + (sim.totalMonthlyHpp * s));
        const revenues = steps.map(s => sim.totalMonthlyRevenue * s);

        this.charts.bepCvp = new Chart(ctxBep, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Beban Tetap (Fixed Cost)',
                data: fixedCosts,
                borderColor: '#e11d48',
                borderDash: [4, 4],
                fill: false,
                pointRadius: 0
              },
              {
                label: 'Total Biaya (Total Cost)',
                data: totalCosts,
                borderColor: '#f59e0b',
                fill: false,
                tension: 0.1,
                pointRadius: 3
              },
              {
                label: 'Total Pendapatan (Revenue)',
                data: revenues,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                ticks: {
                  callback: (val) => Calculations.formatNumber(val / 1000000) + ' Jt'
                }
              }
            },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${Calculations.formatRupiah(ctx.parsed.y)}`
                }
              }
            }
          }
        });
      }

      // 5. Cumulative Cashflow Chart in Tab 5
      const ctxCashflowTab5 = document.getElementById('chart-cumulative-cashflow-tab5');
      if (ctxCashflowTab5) {
        const sim = Calculations.calculateSimulation(this.data);
        this.charts.cashflowTab5 = new Chart(ctxCashflowTab5, {
          type: 'line',
          data: {
            labels: sim.monthlyProjections.map(p => p.month),
            datasets: [
              {
                label: 'Arus Kas Kumulatif (Rp)',
                data: sim.monthlyProjections.map(p => p.cumulativeCashflow),
                borderColor: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#0284c7'
              },
              {
                label: 'Garis Impas (Titik Nol)',
                data: new Array(12).fill(0),
                borderColor: '#ef4444',
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                ticks: {
                  callback: (val) => Calculations.formatNumber(val / 1000000) + ' Jt'
                }
              }
            },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${Calculations.formatRupiah(ctx.parsed.y)}`
                }
              }
            }
          }
        });
      }
    },

    updateCharts() {
      const capex = Calculations.calculateCapex(this.data);
      const modal = Calculations.calculateModalAwal(this.data);
      const sim = Calculations.calculateSimulation(this.data);

      if (this.charts.capex) {
        this.charts.capex.data.labels = capex.categories.map(c => c.name);
        this.charts.capex.data.datasets[0].data = capex.categories.map(c => c.subtotal);
        this.charts.capex.update();
      }

      if (this.charts.modal) {
        this.charts.modal.data.datasets[0].data = [modal.capexTotal, modal.workingCapitalTotal];
        this.charts.modal.update();
      }

      if (this.charts.cashflow) {
        this.charts.cashflow.data.labels = sim.monthlyProjections.map(p => p.month);
        this.charts.cashflow.data.datasets[0].data = sim.monthlyProjections.map(p => p.cumulativeCashflow);
        this.charts.cashflow.update();
      }

      if (this.charts.bepCvp) {
        const steps = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
        this.charts.bepCvp.data.datasets[0].data = steps.map(() => sim.monthlyFixedCost);
        this.charts.bepCvp.data.datasets[1].data = steps.map(s => sim.monthlyFixedCost + (sim.totalMonthlyHpp * s));
        this.charts.bepCvp.data.datasets[2].data = steps.map(s => sim.totalMonthlyRevenue * s);
        this.charts.bepCvp.update();
      }

      if (this.charts.cashflowTab5) {
        this.charts.cashflowTab5.data.labels = sim.monthlyProjections.map(p => p.month);
        this.charts.cashflowTab5.data.datasets[0].data = sim.monthlyProjections.map(p => p.cumulativeCashflow);
        this.charts.cashflowTab5.update();
      }
    },

    openItemModal(catId = null, itemId = null) {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal (Direksi) yang memiliki hak edit.', 'warning');
        return;
      }
      const modal = document.getElementById('item-modal');
      const form = document.getElementById('item-modal-form');
      const title = document.getElementById('item-modal-title');
      const catSelect = document.getElementById('modal-item-cat');

      if (!modal || !form) return;

      // Populate category options
      catSelect.innerHTML = this.data.categories.map(c => `
        <option value="${c.id}">${c.code} - ${c.name}</option>
      `).join('');

      if (catId && itemId) {
        // Edit mode
        this.editingCategory = catId;
        this.editingItem = itemId;
        const cat = this.data.categories.find(c => c.id === catId);
        const item = cat ? cat.items.find(i => i.id === itemId) : null;

        if (item) {
          title.innerText = 'Edit Item Anggaran';
          catSelect.value = catId;
          document.getElementById('modal-item-code').value = item.code || '';
          document.getElementById('modal-item-name').value = item.name || '';
          document.getElementById('modal-item-spec').value = item.spec || '';
          document.getElementById('modal-item-vol').value = item.vol || 1;
          document.getElementById('modal-item-sat').value = item.sat || 'Unit';
          document.getElementById('modal-item-price').value = item.price || 0;
          document.getElementById('modal-item-disc').value = item.discount || 0;
          document.getElementById('modal-item-status').value = item.status || 'pending';
          document.getElementById('modal-item-notes').value = item.notes || '';
        }
      } else {
        // Add mode
        this.editingCategory = null;
        this.editingItem = null;
        title.innerText = 'Tambah Item Anggaran Baru';
        form.reset();
        document.getElementById('modal-item-vol').value = 1;
        document.getElementById('modal-item-sat').value = 'Unit';
        document.getElementById('modal-item-disc').value = 0;
        document.getElementById('modal-item-status').value = 'pending';
      }

      modal.classList.remove('hidden');
    },

    closeItemModal() {
      const modal = document.getElementById('item-modal');
      if (modal) modal.classList.add('hidden');
    },

    saveItemFromModal() {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal (Direksi) yang memiliki hak edit.', 'warning');
        return;
      }
      const catId = document.getElementById('modal-item-cat').value;
      const code = document.getElementById('modal-item-code').value.trim();
      const name = document.getElementById('modal-item-name').value.trim();
      const spec = document.getElementById('modal-item-spec').value.trim();
      const vol = parseFloat(document.getElementById('modal-item-vol').value) || 1;
      const sat = document.getElementById('modal-item-sat').value.trim() || 'Unit';
      const price = parseFloat(document.getElementById('modal-item-price').value) || 0;
      const discount = parseFloat(document.getElementById('modal-item-disc').value) || 0;
      const status = document.getElementById('modal-item-status').value;
      const notes = document.getElementById('modal-item-notes').value.trim();

      const cat = this.data.categories.find(c => c.id === catId);
      if (!cat) return;

      if (this.editingItem) {
        // Find existing and update
        const oldCat = this.data.categories.find(c => c.id === this.editingCategory);
        if (oldCat && oldCat.id !== catId) {
          // Moved category
          const idx = oldCat.items.findIndex(i => i.id === this.editingItem);
          if (idx !== -1) oldCat.items.splice(idx, 1);
          cat.items.push({
            id: this.editingItem,
            code, name, spec, vol, sat, price, discount, status, notes
          });
        } else if (oldCat) {
          const item = oldCat.items.find(i => i.id === this.editingItem);
          if (item) {
            Object.assign(item, { code, name, spec, vol, sat, price, discount, status, notes });
          }
        }
        this.showToast('Item berhasil diperbarui', 'success');
      } else {
        // Create new item
        const newItem = {
          id: 'item_' + Date.now(),
          code: code || `${cat.code}.${cat.items.length + 1}`,
          name,
          spec,
          vol,
          sat,
          price,
          discount,
          status,
          notes
        };
        cat.items.push(newItem);
        this.showToast('Item baru berhasil ditambahkan', 'success');
      }

      this.saveData();
      this.closeItemModal();
      this.render();
      this.updateCharts();
    },

    applyGlobalDiscount() {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal (Direksi) yang berwenang mengubah diskon.', 'warning');
        return;
      }
      const type = document.getElementById('rab-global-disc-type').value;
      const val = parseFloat(document.getElementById('rab-global-disc-val').value) || 0;

      this.data.discount = {
        enabled: val > 0,
        type: type,
        value: val,
        label: 'Potongan Khusus Kemitraan'
      };

      this.saveData(true);
      this.render();
      this.updateCharts();
      this.showToast('Potongan / Diskon berhasil diterapkan!', 'success');
    },

    resetGlobalDiscount() {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal (Direksi) yang berwenang mereset diskon.', 'warning');
        return;
      }
      this.data.discount = {
        enabled: false,
        type: 'nominal',
        value: 0,
        label: 'Potongan Khusus Kemitraan'
      };
      const inputVal = document.getElementById('rab-global-disc-val');
      if (inputVal) inputVal.value = 0;
      this.saveData(true);
      this.render();
      this.updateCharts();
      this.showToast('Potongan global direset', 'info');
    },

    deleteItem(catId, itemId) {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal (Direksi) yang memiliki hak edit.', 'warning');
        return;
      }
      const cat = this.data.categories.find(c => c.id === catId);
      if (!cat) return;
      const item = cat.items.find(i => i.id === itemId);
      if (!item) return;

      if (confirm(`Hapus item "${item.name}" dari anggaran?`)) {
        cat.items = cat.items.filter(i => i.id !== itemId);
        this.saveData();
        this.render();
        this.updateCharts();
        this.showToast('Item berhasil dihapus', 'info');
      }
    },

    renderPrintDocument() {
      const container = document.getElementById('print-document-content');
      if (!container) return;

      const meta = this.data.meta;
      const capex = Calculations.calculateCapex(this.data);
      const modal = Calculations.calculateModalAwal(this.data);
      const wc = Calculations.calculateWorkingCapital(this.data);
      const sim = Calculations.calculateSimulation(this.data);

      const cat1 = this.data.categories[0]; // Interior
      const cat2 = this.data.categories[1]; // Equipment
      const cat3 = this.data.categories[2]; // Marketing & Stok
      const cat4 = this.data.categories[3]; // Perizinan
      const cat5 = this.data.categories[4]; // Tambahan

      const sub1 = capex.categories[0]?.subtotal || 0;
      const sub2 = capex.categories[1]?.subtotal || 0;
      const sub3 = capex.categories[2]?.subtotal || 0;
      const sub4 = capex.categories[3]?.subtotal || 0;
      const sub5 = capex.categories[4]?.subtotal || 0;

      const renderItemsRows = (items) => {
        return items.map(item => `
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="text-align: center; font-size: 8pt; padding: 4px 6px;">${item.code}</td>
            <td style="font-size: 8.5pt; font-weight: 600; padding: 4px 6px;">
              ${item.name}
              <div style="font-size: 7.5pt; font-weight: normal; color: #475569;">${item.spec}</div>
            </td>
            <td style="text-align: center; font-size: 8pt; padding: 4px 6px;">${item.vol}</td>
            <td style="text-align: center; font-size: 8pt; padding: 4px 6px;">${item.sat}</td>
            <td style="text-align: right; font-size: 8.5pt; font-weight: 600; padding: 4px 6px;">${Calculations.formatNumber(item.vol * item.price)}</td>
          </tr>
        `).join('');
      };

      let printHtml = `
        <!-- HALAMAN 1 DOKUMEN RESMI RAB (Sesuai PDF Asli) -->
        <div class="print-page bg-white p-6 mb-8 text-slate-900 border border-slate-200">
          <div class="flex justify-between items-start border-b-2 border-sky-600 pb-3 mb-4">
            <div>
              <h1 class="text-xl font-black tracking-tight text-slate-900">SNAPRINT DIGITAL PRINTING</h1>
              <p class="text-xs font-bold text-sky-700 tracking-wide">RENCANA ANGGARAN BIAYA (RAB) PEMBUKAAN OUTLET BARU</p>
            </div>
            <div class="text-right text-[9pt] leading-tight text-slate-600">
              <div><strong>No. Dokumen:</strong> ${meta.documentNo}</div>
              <div><strong>Lokasi Outlet:</strong> ${meta.outletLocation}</div>
              <div><strong>Tanggal Penyusunan:</strong> ${meta.date}</div>
              <div><strong>Versi Perencanaan:</strong> Final Draft 1.0</div>
            </div>
          </div>

          <!-- 4 Meta Badges Header -->
          <div class="grid grid-cols-4 gap-2 mb-4 text-center">
            <div class="border border-sky-300 bg-sky-50/40 p-2 rounded">
              <div class="text-[7.5pt] uppercase font-bold text-slate-500">Status Proyek</div>
              <div class="text-xs font-bold text-sky-900">${meta.projectStatus}</div>
            </div>
            <div class="border border-sky-300 bg-sky-50/40 p-2 rounded">
              <div class="text-[7.5pt] uppercase font-bold text-slate-500">Target Durasi</div>
              <div class="text-xs font-bold text-sky-900">${meta.targetDuration}</div>
            </div>
            <div class="border border-sky-300 bg-sky-50/40 p-2 rounded">
              <div class="text-[7.5pt] uppercase font-bold text-slate-500">Luas Area Standar</div>
              <div class="text-xs font-bold text-sky-900">${meta.standardArea}</div>
            </div>
            <div class="border border-sky-300 bg-sky-50/40 p-2 rounded">
              <div class="text-[7.5pt] uppercase font-bold text-slate-500">Model Mesin Produksi</div>
              <div class="text-xs font-bold text-sky-900">${meta.machineModel}</div>
            </div>
          </div>

          <!-- Section 01: Interior dan Furniture -->
          <div class="mb-4">
            <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5 flex items-center justify-between">
              <span>01 Interior dan Furniture (Fit-Out Outlet)</span>
            </div>
            <table class="w-full text-left border-collapse text-[8.5pt]">
              <thead>
                <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                  <th class="w-10 text-center p-1 border">No</th>
                  <th class="p-1 border">Item Pekerjaan & Furniture / Rincian Teknis</th>
                  <th class="w-12 text-center p-1 border">Vol</th>
                  <th class="w-12 text-center p-1 border">Sat</th>
                  <th class="w-28 text-right p-1 border">Estimasi (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${renderItemsRows(cat1.items)}
                <tr class="bg-sky-50 font-bold border border-slate-300 text-sky-950">
                  <td colspan="4" class="p-1.5 text-right">Subtotal 1: Interior dan Furniture</td>
                  <td class="p-1.5 text-right">${Calculations.formatNumber(sub1)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section 02: Equipment dan Inventori -->
          <div class="mb-3">
            <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5 flex items-center justify-between">
              <span>02 Equipment dan Inventori (Hardware & Mesin)</span>
            </div>
            <table class="w-full text-left border-collapse text-[8.5pt]">
              <thead>
                <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                  <th class="w-10 text-center p-1 border">No</th>
                  <th class="p-1 border">Kategori Alat / Perangkat & Spesifikasi</th>
                  <th class="w-12 text-center p-1 border">Vol</th>
                  <th class="w-12 text-center p-1 border">Sat</th>
                  <th class="w-28 text-right p-1 border">Estimasi (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${renderItemsRows(cat2.items)}
                <tr class="bg-sky-50 font-bold border border-slate-300 text-sky-950">
                  <td colspan="4" class="p-1.5 text-right">Subtotal 2: Equipment dan Inventori</td>
                  <td class="p-1.5 text-right">${Calculations.formatNumber(sub2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-4">
            <span>Snaprint Digital Printing — Rencana Anggaran Biaya & Dokumen Pengadaan</span>
            <span>Halaman 1 dari 5</span>
          </div>
        </div>

        <!-- HALAMAN 2 DOKUMEN RESMI RAB (Sesuai PDF Asli Halaman 2) -->
        <div class="print-page print-page-break bg-white p-6 mb-8 text-slate-900 border border-slate-200">
          <div class="flex justify-between items-center border-b pb-2 mb-3 text-xs text-slate-500">
            <span><strong>No. Dokumen:</strong> ${meta.documentNo}</span>
            <span>Lampiran Lanjutan Rencana Anggaran Biaya</span>
          </div>

          <!-- Section 03: Marketing & Stok -->
          <div class="mb-3">
            <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5">
              03 Marketing Tools dan Stok Bahan Awal
            </div>
            <table class="w-full text-left border-collapse text-[8.5pt]">
              <thead>
                <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                  <th class="w-10 text-center p-1 border">No</th>
                  <th class="p-1 border">Item Promosi / Stok & Detail Item</th>
                  <th class="w-12 text-center p-1 border">Vol</th>
                  <th class="w-12 text-center p-1 border">Sat</th>
                  <th class="w-28 text-right p-1 border">Estimasi (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${renderItemsRows(cat3.items)}
                <tr class="bg-sky-50 font-bold border border-slate-300 text-sky-950">
                  <td colspan="4" class="p-1.5 text-right">Subtotal 3: Marketing Tools dan Stok Awal</td>
                  <td class="p-1.5 text-right">${Calculations.formatNumber(sub3)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 2 Columns: 04 Biaya Lisensi & Perizinan & 05 Pekerjaan Tambahan -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5">
                ${cat4.code} ${cat4.name}
              </div>
              <table class="w-full text-left border-collapse text-[8.5pt]">
                <thead>
                  <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                    <th class="w-8 text-center p-1 border">No</th>
                    <th class="p-1 border">Uraian Lisensi & Legalitas</th>
                    <th class="w-24 text-right p-1 border">Estimasi (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  ${cat4.items.map(i => {
                    const iGross = i.vol * i.price;
                    const iDisc = Math.min(iGross, Math.max(0, parseFloat(i.discount || 0)));
                    const iNet = Math.max(0, iGross - iDisc);
                    return `
                    <tr class="border-b">
                      <td class="text-center p-1 border">${i.code}</td>
                      <td class="p-1 border">
                        ${i.name}
                        ${iDisc > 0 ? `<div class="text-[7pt] text-emerald-700 font-bold">(Disc Potongan: -${Calculations.formatNumber(iDisc)})</div>` : ''}
                      </td>
                      <td class="text-right p-1 border font-semibold">${Calculations.formatNumber(iNet)}</td>
                    </tr>
                    `;
                  }).join('')}
                  <tr class="bg-sky-50 font-bold border text-sky-950">
                    <td colspan="2" class="p-1 text-right">Subtotal 4: Lisensi & Perizinan</td>
                    <td class="p-1 text-right">${Calculations.formatNumber(sub4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5">
                05 Pekerjaan Tambahan
              </div>
              <table class="w-full text-left border-collapse text-[8.5pt]">
                <thead>
                  <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                    <th class="w-8 text-center p-1 border">No</th>
                    <th class="p-1 border">Pos Pekerjaan / Cadangan</th>
                    <th class="w-24 text-right p-1 border">Estimasi (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  ${cat5.items.map(i => `
                    <tr class="border-b">
                      <td class="text-center p-1 border">${i.code}</td>
                      <td class="p-1 border">${i.name}</td>
                      <td class="text-right p-1 border font-semibold">${Calculations.formatNumber(i.vol * i.price)}</td>
                    </tr>
                  `).join('')}
                  <tr class="bg-sky-50 font-bold border text-sky-950">
                    <td colspan="2" class="p-1 text-right">Subtotal 5: Tambahan</td>
                    <td class="p-1 text-right">${Calculations.formatNumber(sub5)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 06: Resume Total Rencana Anggaran Biaya (CAPEX) -->
          <div class="mb-3">
            <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5">
              06 Resume Total Rencana Anggaran Biaya (CAPEX)
            </div>
            <table class="w-full text-left border-collapse text-[8.5pt]">
              <thead>
                <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                  <th class="w-8 text-center p-1 border">No</th>
                  <th class="p-1 border">Kategori Komponen Biaya</th>
                  <th class="w-24 text-center p-1 border">Alokasi (%)</th>
                  <th class="w-32 text-right p-1 border">Nilai Anggaran (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${capex.categories.map((c, i) => `
                  <tr class="border-b">
                    <td class="text-center p-1 border">${i + 1}</td>
                    <td class="p-1 border">${c.name}</td>
                    <td class="text-center p-1 border">${c.sharePercent.toFixed(2)} %</td>
                    <td class="text-right p-1 border font-semibold">${Calculations.formatNumber(c.subtotal)}</td>
                  </tr>
                `).join('')}
                ${capex.totalDiscount > 0 ? `
                  <tr class="bg-slate-50 font-bold border-t text-slate-700">
                    <td colspan="2" class="p-1">Subtotal Anggaran Sebelum Potongan</td>
                    <td class="p-1 text-center">-</td>
                    <td class="p-1 text-right">${Calculations.formatNumber(capex.totalGross)}</td>
                  </tr>
                  <tr class="bg-emerald-50 font-bold border-t text-emerald-900">
                    <td colspan="2" class="p-1">Total Potongan / Diskon (Disc)</td>
                    <td class="p-1 text-center font-bold text-emerald-700">-${capex.discountPercent.toFixed(1)}%</td>
                    <td class="p-1 text-right font-bold text-emerald-700">-${Calculations.formatNumber(capex.totalDiscount)}</td>
                  </tr>
                ` : ''}
                <tr class="bg-sky-100 font-black border-2 border-sky-700 text-sky-950 text-[9pt]">
                  <td colspan="2" class="p-1.5">TOTAL ESTIMASI INVESTASI AWAL NET (CAPEX)</td>
                  <td class="p-1.5 text-center">100,00 %</td>
                  <td class="p-1.5 text-right">${Calculations.formatRupiah(capex.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section 07: Cash Flow Penggunaan Dana (Termin 4 Minggu) -->
          <div class="mb-4">
            <div class="bg-sky-700 text-white font-bold text-xs px-2.5 py-1 mb-1.5">
              07 Cash Flow Penggunaan Dana (Termin 4 Minggu)
            </div>
            <table class="w-full text-left border-collapse text-[8.5pt]">
              <thead>
                <tr class="bg-slate-100 border border-slate-300 text-slate-700 text-[8pt]">
                  <th class="w-20 p-1 border">Termin</th>
                  <th class="w-20 p-1 border">Jadwal</th>
                  <th class="p-1 border">Fokus & Rincian Pengeluaran Dana</th>
                  <th class="w-16 text-center p-1 border">Porsi (%)</th>
                  <th class="w-28 text-right p-1 border">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${this.data.cashFlowSchedule.map(term => {
                  const nominal = (term.sharePercent / 100) * capex.grandTotal;
                  return `
                    <tr class="border-b">
                      <td class="p-1 border font-semibold">${term.termin}</td>
                      <td class="p-1 border text-slate-600">${term.week}</td>
                      <td class="p-1 border text-xs">${term.focus}</td>
                      <td class="p-1 border text-center font-semibold">${term.sharePercent} %</td>
                      <td class="p-1 border text-right font-bold">${Calculations.formatNumber(nominal)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Signature Blocks -->
          <div class="grid grid-cols-3 gap-4 border border-slate-300 p-3 text-center text-xs mt-4">
            <div>
              <div class="font-bold text-slate-600 mb-12">DIAJUKAN OLEH:</div>
              <div class="font-bold text-slate-900 border-t border-slate-400 pt-1">Tim Proyek Snaprint</div>
            </div>
            <div>
              <div class="font-bold text-slate-600 mb-12">DIPERIKSA OLEH:</div>
              <div class="font-bold text-slate-900 border-t border-slate-400 pt-1">Finance & Operasional</div>
            </div>
            <div>
              <div class="font-bold text-slate-600 mb-12">DISETUJUI OLEH:</div>
              <div class="font-bold text-slate-900 border-t border-slate-400 pt-1">Owner / Direksi Snaprint</div>
            </div>
          </div>

          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-4">
            <span>Snaprint Digital Printing — Rencana Anggaran Biaya & Dokumen Pengadaan</span>
            <span>Halaman 2 dari 5</span>
          </div>
        </div>

        <!-- HALAMAN 3 DOKUMEN RESMI PERKIRAAN MODAL AWAL & ANALISIS KELAYAKAN USAHA -->
        <div class="print-page print-page-break bg-white p-6 text-slate-900 border border-slate-200">
          <div class="flex justify-between items-start border-b-2 border-emerald-600 pb-3 mb-4">
            <div>
              <h1 class="text-xl font-black tracking-tight text-slate-900">SNAPRINT DIGITAL PRINTING</h1>
              <p class="text-xs font-bold text-emerald-700 tracking-wide">PERKIRAAN MODAL AWAL & ANALISIS KELAYAKAN FINANSIAL OUTLET BARU</p>
            </div>
            <div class="text-right text-[9pt] leading-tight text-slate-600">
              <div><strong>Status:</strong> Dokumen Pelengkap Bisnis</div>
              <div><strong>Tanggal:</strong> ${meta.date}</div>
              <div><strong>Durasi Cadangan:</strong> ${wc.runwayMonths} Bulan Runway Operasional</div>
            </div>
          </div>

          <!-- Ringkasan Komprehensif Modal Awal -->
          <div class="border-2 border-emerald-500 rounded p-3 mb-4 bg-emerald-50/30">
            <h2 class="text-sm font-bold text-emerald-950 mb-2">REKAPITULASI TOTAL MODAL AWAL DIBUTUHKAN</h2>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-white p-2.5 rounded border border-emerald-200 shadow-sm">
                <div class="text-[8pt] uppercase font-bold text-slate-500">1. Investasi Aset Tetap (CAPEX)</div>
                <div class="text-base font-black text-slate-900">${Calculations.formatRupiah(modal.capexTotal)}</div>
                <div class="text-[7.5pt] text-slate-500">${modal.capexPercent.toFixed(1)}% porsi dari total modal</div>
              </div>
              <div class="bg-white p-2.5 rounded border border-emerald-200 shadow-sm">
                <div class="text-[8pt] uppercase font-bold text-slate-500">2. Modal Kerja Cadangan (Working Capital)</div>
                <div class="text-base font-black text-emerald-700">${Calculations.formatRupiah(modal.workingCapitalTotal)}</div>
                <div class="text-[7.5pt] text-slate-500">${modal.workingCapitalPercent.toFixed(1)}% (Sewa + Gaji + Utilitas + Kas Buffer)</div>
              </div>
              <div class="bg-emerald-600 text-white p-2.5 rounded border border-emerald-700 shadow-sm">
                <div class="text-[8pt] uppercase font-bold text-emerald-100">TOTAL MODAL AWAL KOMPREHENSIF</div>
                <div class="text-base font-black">${Calculations.formatRupiah(modal.totalModalAwal)}</div>
                <div class="text-[7.5pt] text-emerald-100">Kesiapan Dana Aman 100%</div>
              </div>
            </div>
          </div>

          <!-- Rincian Modal Kerja (Working Capital Breakdown) -->
          <div class="mb-4">
            <h3 class="text-xs font-bold text-slate-800 bg-slate-100 p-1.5 border border-slate-300 mb-1">
              Rincian Kebutuhan Modal Kerja Awal (${wc.runwayMonths} Bulan Pertama):
            </h3>
            <table class="w-full text-[8.5pt] border-collapse border border-slate-300">
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Sewa Tempat Ruko 1 Tahun Dimuka + Deposit Keamanan</td>
                <td class="p-1.5 text-right font-mono font-semibold border">${Calculations.formatRupiah(wc.rentCashNeeded)}</td>
              </tr>
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Cadangan Gaji 4 Orang Staf Operasional (${wc.runwayMonths} Bulan x ${Calculations.formatRupiah(wc.monthlySalaries)}/bln)</td>
                <td class="p-1.5 text-right font-mono font-semibold border">${Calculations.formatRupiah(wc.salariesBuffer)}</td>
              </tr>
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Cadangan Biaya Utilitas Listrik & Internet (${wc.runwayMonths} Bulan x ${Calculations.formatRupiah(wc.monthlyUtilities)}/bln)</td>
                <td class="p-1.5 text-right font-mono font-semibold border">${Calculations.formatRupiah(wc.utilitiesBuffer)}</td>
              </tr>
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Cadangan Biaya Promosi & Pemasaran Rutin (${wc.runwayMonths} Bulan)</td>
                <td class="p-1.5 text-right font-mono font-semibold border">${Calculations.formatRupiah(wc.marketingBuffer)}</td>
              </tr>
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Cadangan Kas Darurat Outlet (Petty Cash Reserve)</td>
                <td class="p-1.5 text-right font-mono font-semibold border">${Calculations.formatRupiah(wc.pettyCashBuffer)}</td>
              </tr>
              <tr class="bg-emerald-50 font-bold border-t border-slate-400 text-emerald-950">
                <td class="p-1.5 border">Subtotal Modal Kerja Cadangan Operasional</td>
                <td class="p-1.5 text-right border">${Calculations.formatRupiah(wc.totalWorkingCapital)}</td>
              </tr>
            </table>
          </div>

          <!-- Analisis BEP & Estimasi Balik Modal -->
          <div class="mb-4">
            <h3 class="text-xs font-bold text-slate-800 bg-slate-100 p-1.5 border border-slate-300 mb-1">
              Analisis Break-Even Point (BEP) & Payback Period:
            </h3>
            <table class="w-full text-[8.5pt] border-collapse border border-slate-300">
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Target Kapasitas Produksi A3+ per Hari</td>
                <td class="p-1.5 text-right font-mono border font-semibold">${this.data.simulation.dailyA3Prints} lembar / hari</td>
                <td class="p-1.5 font-medium border">Beban Operasional Tetap / Bulan (OPEX)</td>
                <td class="p-1.5 text-right font-mono border font-semibold">${Calculations.formatRupiah(sim.monthlyFixedCost)}</td>
              </tr>
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Estimasi Omset Total Bulanan</td>
                <td class="p-1.5 text-right font-mono border font-semibold">${Calculations.formatRupiah(sim.totalMonthlyRevenue)}</td>
                <td class="p-1.5 font-medium border">Total Biaya Operasional (% Biaya)</td>
                <td class="p-1.5 text-right font-mono border font-bold text-rose-700">${Calculations.formatRupiah(sim.totalMonthlyExpense)} (${sim.expenseRatioPercent.toFixed(1)}%)</td>
              </tr>
              <tr class="border-b">
                <td class="p-1.5 font-medium border">Estimasi Hasil Bersih / Laba (EBITDA)</td>
                <td class="p-1.5 text-right font-mono border font-bold text-emerald-700">${Calculations.formatRupiah(sim.monthlyNetProfit)}</td>
                <td class="p-1.5 font-medium border">% Hasil Bersih (Net Profit Margin)</td>
                <td class="p-1.5 text-right font-mono border font-bold text-emerald-700">${sim.netProfitMarginPercent.toFixed(1)} %</td>
              </tr>
              <tr class="bg-slate-50 border-t border-slate-300 font-bold">
                <td class="p-1.5 border text-sky-900">Titik Impas (BEP Omset Bulanan)</td>
                <td class="p-1.5 text-right border text-sky-900 font-mono">${Calculations.formatRupiah(sim.bepMonthlyRevenue)}</td>
                <td class="p-1.5 border text-sky-900">BEP Volume Cetak A3+ Minimum</td>
                <td class="p-1.5 text-right border text-sky-900 font-mono">${Math.ceil(sim.bepA3SheetsPerDay)} lbr / hari</td>
              </tr>
              <tr class="bg-amber-50 font-bold border-t border-amber-300">
                <td class="p-1.5 border text-amber-950">Estimasi Balik Modal (Payback Period Total Modal)</td>
                <td class="p-1.5 text-right border text-amber-950 font-mono">${sim.paybackMonthsTotalModal.toFixed(1)} Bulan (~ ${(sim.paybackMonthsTotalModal/12).toFixed(1)} Tahun)</td>
                <td class="p-1.5 border text-amber-950">Return On Investment (ROI Tahunan)</td>
                <td class="p-1.5 text-right border text-amber-950 font-mono">${sim.annualRoiPercent.toFixed(1)} % / Tahun</td>
              </tr>
            </table>
          </div>

          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-4">
            <span>Snaprint Digital Printing — Rencana Anggaran Biaya & Dokumen Pengadaan</span>
            <span>Halaman 3 dari 5</span>
          </div>
        </div>

        <!-- HALAMAN 4: DRAFT MOU KEMITRAAN (LEMBAR 1 DARI 2) -->
        <div class="print-page bg-white p-8 mb-8 text-slate-900 border border-slate-200">
          ${this.generateMouPage1Html(true)}
          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-6">
            <span>Dokumen Resmi Nota Kesepahaman (MoU) — Snaprint Digital Printing</span>
            <span>Halaman 4 dari 5</span>
          </div>
        </div>

        <!-- HALAMAN 5: DRAFT MOU KEMITRAAN (LEMBAR 2 DARI 2 - BERMATERAI) -->
        <div class="print-page bg-white p-8 mb-8 text-slate-900 border border-slate-200">
          ${this.generateMouPage2Html(true)}
          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-6">
            <span>Dokumen Resmi Nota Kesepahaman (MoU) — Snaprint Digital Printing</span>
            <span>Halaman 5 dari 5 (Bermaterai Rp 10.000)</span>
          </div>
        </div>
      `;

      container.innerHTML = printHtml;
      const printOnlyContainer = document.getElementById('print-document-container');
      if (printOnlyContainer) {
        printOnlyContainer.innerHTML = printHtml;
      }
    },


    /* ========================================================= */
    /* MODUL DRAFT NOTA KESEPAHAMAN (MoU) KEMITRAAN (HALAMAN 3)  */
    /* ========================================================= */
    toggleMouEditor() {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Hanya Principal yang berwenang mengedit draf klausul MoU.', 'warning');
        return;
      }
      const editor = document.getElementById('mou-editor-card');
      const btnText = document.getElementById('btn-toggle-mou-editor-text');
      if (editor) {
        editor.classList.toggle('hidden');
        if (btnText) {
          btnText.innerText = editor.classList.contains('hidden') 
            ? 'Edit Data Calon Mitra & Lokasi' 
            : 'Tutup Form Editor Data';
        }
      }
    },

    handleMouInputChange(key, val) {
      if (!this.isPrincipal()) return;
      if (!this.data.mou) this.data.mou = JSON.parse(JSON.stringify(window.DEFAULT_RAB_DATA.mou || {}));
      this.data.mou[key] = val;
      this.renderMouTab(false);
      this.saveData(false);
    },

    handleMouPihak2Change(key, val) {
      if (!this.isPrincipal()) return;
      if (!this.data.mou) this.data.mou = JSON.parse(JSON.stringify(window.DEFAULT_RAB_DATA.mou || {}));
      if (!this.data.mou.pihak2) this.data.mou.pihak2 = {};
      this.data.mou.pihak2[key] = val;
      this.renderMouTab(false);
      this.saveData(false);
    },

    renderMouTab(updateInputs = true) {
      if (!this.data.mou) {
        this.data.mou = JSON.parse(JSON.stringify(window.DEFAULT_RAB_DATA.mou || {}));
      }
      const mou = this.data.mou;

      if (updateInputs) {
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el && val !== undefined) el.value = val;
        };
        setVal('mou-input-nomor', mou.nomor || '');
        setVal('mou-input-kota', mou.kotaDomisili || 'Jakarta');
        setVal('mou-input-hari', mou.hari || 'Rabu');
        setVal('mou-input-tanggal', mou.tanggal || '21');
        setVal('mou-input-bulan', mou.bulan || 'Oktober');
        setVal('mou-input-tahun', mou.tahun || '2026');
        setVal('mou-input-nama', (mou.pihak2 && mou.pihak2.nama) || '');
        setVal('mou-input-nik', (mou.pihak2 && mou.pihak2.nik) || '');
        setVal('mou-input-lokasi', mou.lokasiUsaha || '');
        setVal('mou-input-alamat', (mou.pihak2 && mou.pihak2.alamat) || '');
      }

      const previewContainer = document.getElementById('mou-preview-container');
      if (previewContainer) {
        previewContainer.innerHTML = `
          <!-- LEMBAR 1 DARI 2 -->
          <div class="mou-paper p-8 sm:p-12 rounded-2xl border border-slate-200">
            ${this.generateMouPage1Html(false)}
            <div class="text-[8pt] text-slate-400 flex justify-between border-t pt-3 mt-8">
              <span>Halaman 1 dari 2 &bull; Dokumen Nota Kesepahaman (MoU) Snaprint Digital Printing</span>
              <span>Dokumen No: ${mou.nomor || '______/MoU/SNAPRINT/PRIN-MITRA/2026'}</span>
            </div>
          </div>

          <!-- LEMBAR 2 DARI 2 (BERMATERAI) -->
          <div class="mou-paper p-8 sm:p-12 rounded-2xl border border-slate-200">
            ${this.generateMouPage2Html(false)}
            <div class="text-[8pt] text-slate-400 flex justify-between border-t pt-3 mt-8">
              <span>Halaman 2 dari 2 &bull; Dokumen Nota Kesepahaman (MoU) Snaprint Digital Printing</span>
              <span class="text-emerald-700 font-semibold">Lampiran Materai Cukup Rp 10.000</span>
            </div>
          </div>
        `;
      }
    },

    generateMouPage1Html(isPrint = false) {
      const mou = this.data.mou || {};
      const pihak1 = mou.pihak1 || { instansi: 'SNAPRINT DIGITAL PRINTING', penanggungJawab: 'Direktur / Manajemen', alamat: 'Kantor Pusat Snaprint Digital Printing, Jakarta' };
      const pihak2 = mou.pihak2 || { nama: 'Calon Mitra / Prospective Buyer', nik: '3171000000000000', alamat: 'Sesuai KTP / Tempat Tinggal' };

      return `
        <!-- Header & Kop Snaprint -->
        <div class="border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-white p-1 border border-slate-300 shadow-sm flex items-center justify-center shrink-0">
              <img src="assets/snaprint-logo.jpg" alt="Snaprint Logo" class="w-full h-full object-contain">
            </div>
            <div>
              <div class="font-black text-xl tracking-tight text-slate-900">SNAPRINT DIGITAL PRINTING</div>
              <div class="text-[9.5pt] font-bold text-sky-800 tracking-wider uppercase">Jaringan Bisnis Percetakan Digital &amp; Outdoor Advertising</div>
              <div class="text-[8pt] text-slate-500">${pihak1.alamat}</div>
            </div>
          </div>
          <div class="text-right text-[8.5pt] text-slate-600 leading-tight">
            <div class="font-bold text-slate-900">NOTA KESEPAHAMAN (MoU)</div>
            <div class="font-mono text-[8pt] text-sky-700">${mou.nomor || '______/MoU/SNAPRINT/PRIN-MITRA/2026'}</div>
            <div class="text-[7.5pt] text-emerald-700 font-semibold mt-0.5">Kemitraan Lisensi Brand</div>
          </div>
        </div>

        <!-- Judul Dokumen -->
        <div class="text-center mb-6">
          <h2 class="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
            MEMORANDUM OF UNDERSTANDING (MOU)
          </h2>
          <div class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            KEMITRAAN USAHA SNAPRINT DIGITAL PRINTING
          </div>
          <div class="text-[9pt] font-mono text-slate-600 mt-1">
            Nomor: <strong>${mou.nomor || '______/MoU/SNAPRINT/PRIN-MITRA/2026'}</strong>
          </div>
        </div>

        <!-- Preamble / Pembukaan -->
        <div class="text-[9pt] leading-relaxed text-slate-800 space-y-3 mb-5 text-justify">
          <p>
            Pada hari ini <strong>${mou.hari || 'Rabu'}</strong>, tanggal <strong>${mou.tanggal || '21'}</strong> bulan <strong>${mou.bulan || 'Oktober'}</strong> tahun <strong>${mou.tahun || '2026'}</strong> (${mou.tanggal || '21'}-${mou.bulan || '10'}-${mou.tahun || '2026'}), bertempat di <strong>${mou.kotaDomisili || 'Jakarta'}</strong>, para pihak yang bertanda tangan di bawah ini:
          </p>

          <div class="pl-4 space-y-2 border-l-2 border-slate-300 py-1">
            <div class="grid grid-cols-12 gap-1">
              <span class="col-span-1 font-bold">1.</span>
              <div class="col-span-11">
                <strong>${pihak1.instansi}</strong>, berkedudukan di ${pihak1.alamat}, dalam hal ini diwakili oleh <strong>${pihak1.penanggungJawab}</strong> bertindak dalam jabatannya selaku manajemen pengelola brand, selanjutnya disebut sebagai <strong>"PIHAK PERTAMA"</strong>.
              </div>
            </div>

            <div class="grid grid-cols-12 gap-1 pt-1">
              <span class="col-span-1 font-bold">2.</span>
              <div class="col-span-11">
                <strong>${pihak2.nama}</strong>, pemegang Kartu Tanda Penduduk (KTP) No. <span class="font-mono font-bold">${pihak2.nik}</span>, beralamat di ${pihak2.alamat}, bertindak untuk dan atas nama pribadi, selanjutnya disebut sebagai <strong>"PIHAK KEDUA"</strong>.
              </div>
            </div>
          </div>

          <p>
            (PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama disebut sebagai <strong>"PARA PIHAK"</strong>, dan secara sendiri-sendiri disebut sebagai <strong>"PIHAK"</strong>).
          </p>

          <p class="font-medium text-slate-700">
            PARA PIHAK terlebih dahulu menerangkan hal-hal sebagai berikut:
          </p>
          <ol class="list-none space-y-1.5 pl-4">
            <li class="flex items-start gap-2">
              <span class="font-bold">a.</span>
              <span>Bahwa PIHAK PERTAMA adalah pemilik dan pengelola jaringan bisnis Snaprint Digital Printing yang bergerak dalam bidang percetakan digital, outdoor advertising, dan layanan dokumen profesional.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="font-bold">b.</span>
              <span>Bahwa PIHAK KEDUA bermaksud menjalin kemitraan usaha (franchise/lisensi) pembukaan gerai baru Snaprint Digital Printing pada lokasi yang disepakati bersama.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="font-bold">c.</span>
              <span>Bahwa Nota Kesepahaman ini dibuat sebagai landasan kesepakatan prinsip awal sebelum penandatanganan Perjanjian Kerjasama (PKS) Definitif.</span>
            </li>
          </ol>

          <p>
            Maka berlandaskan itikad baik dan asas saling menguntungkan, PARA PIHAK sepakat mengikatkan diri dalam ketentuan-ketentuan sebagai berikut:
          </p>
        </div>

        <!-- PASAL 1 -->
        <div class="mb-4">
          <div class="mou-article-header text-slate-900">
            PASAL 1: KETENTUAN UMUM DAN PENETAPAN LOKASI
          </div>
          <div class="text-[9pt] leading-relaxed text-slate-800 space-y-2 text-justify pl-3">
            <p>
              1. PARA PIHAK sepakat untuk bekerjasama dalam pembukaan dan operasional outlet Snaprint Digital Printing yang berlokasi di: <strong>${mou.lokasiUsaha || 'Ruko Sentra Bisnis Utama (Target Titik Gerai Snaprint)'}</strong>.
            </p>
            <p>
              2. Segala bentuk pekerjaan renovasi, instalasi kelistrikan/utilitas, dan penataan interior gerai dimulai setelah PIHAK KEDUA menyelesaikan seluruh kewajiban pembayaran pelunasan sewa lokasi usaha tersebut kepada pihak pemilik tempat.
            </p>
          </div>
        </div>

        <!-- PASAL 2 -->
        <div class="mb-2">
          <div class="mou-article-header text-slate-900">
            PASAL 2: KEWAJIBAN PIHAK PERTAMA
          </div>
          <div class="text-[9pt] leading-relaxed text-slate-800 space-y-2 text-justify pl-3">
            <p>
              PIHAK PERTAMA berkewajiban untuk memberikan dukungan persiapan, standardisasi gerai, dan pendampingan teknis kepada PIHAK KEDUA yang meliputi:
            </p>
            <ol class="space-y-1.5 pl-4 list-decimal">
              <li>
                <strong>Sistem Terintegrasi</strong>: Menyediakan hak akses sistem kasir terpadu (POS &amp; ERP Cloud Snaprint) untuk pencatatan transaksi kasir, inventori bahan baku cetak, dan monitoring laporan omset harian.
              </li>
              <li>
                <strong>Pelatihan SDM</strong>: Menyelenggarakan program pelatihan (training) operasional dan teknis bagi karyawan/operator gerai PIHAK KEDUA sebelum peresmian pembukaan (Grand Opening).
              </li>
              <li>
                <strong>Setup Fisik Gerai</strong>: Merancang dan melaksanakan penataan layout toko (fit-out), pemasangan signage neon box eksterior, backdrop kasir, dan penataan area kerja produksi sesuai standar brand Snaprint.
              </li>
              <li>
                <strong>Infrastruktur Jaringan &amp; Utilitas</strong>: Melakukan instalasi kabel jaringan LAN berkecepatan tinggi, setup kelistrikan khusus mesin digital printing, dan grounding pengaman mesin.
              </li>
              <li>
                <strong>Peralatan Pendukung</strong>: Menyediakan daftar spesifikasi dan pengadaan sarana kerja, komputer desain grafis, meja produksi, serta alat finishing pendukung.
              </li>
              <li>
                <strong>Supervisi Operasional</strong>: Melakukan pendampingan dan supervisi berkala pada fase persiapan maupun saat pembukaan gerai guna menjamin standar operasional prosedur (SOP) berjalan optimal.
              </li>
              <li>
                <strong>Konsultasi Pengadaan Mesin</strong>: Memberikan rekomendasi, konsultasi teknis, dan mediasi pengadaan unit mesin produksi utama (mesin digital laser A3+ dan mesin outdoor) dari vendor terpercaya dengan garansi purna jual resmi.
              </li>
            </ol>
          </div>
        </div>
      `;
    },

    generateMouPage2Html(isPrint = false) {
      const mou = this.data.mou || {};
      const pihak1 = mou.pihak1 || { instansi: 'SNAPRINT DIGITAL PRINTING', penanggungJawab: 'Direktur / Manajemen', alamat: 'Kantor Pusat Snaprint Digital Printing, Jakarta' };
      const pihak2 = mou.pihak2 || { nama: 'Calon Mitra / Prospective Buyer', nik: '3171000000000000', alamat: 'Sesuai KTP / Tempat Tinggal' };
      const tahap = mou.tahapPembayaran || [
        { tahap: 'Tahap 1', persentase: '50%', keterangan: 'Dibayarkan pasca pelunasan sewa lokasi saat penandatanganan dan dimulainya pekerjaan setup.' },
        { tahap: 'Tahap 2', persentase: '40%', keterangan: 'Dibayarkan saat progres renovasi, penataan interior/eksterior, dan pengadaan sarana mencapai tahap pertengahan.' },
        { tahap: 'Tahap 3', persentase: '10%', keterangan: 'Pelunasan akhir yang dibayarkan ketika seluruh toko selesai disetup dan siap beroperasi penuh.' }
      ];

      return `
        <!-- Header Halaman 2 -->
        <div class="border-b border-slate-400 pb-2 mb-4 flex justify-between items-center text-[8pt] text-slate-600">
          <div class="flex items-center gap-2 font-bold text-slate-800">
            <span class="w-2 h-2 rounded-full bg-sky-600"></span>
            <span>SNAPRINT DIGITAL PRINTING &bull; DRAFT NOTA KESEPAHAMAN (MoU) KEMITRAAN</span>
          </div>
          <div>No. Dokumen: ${mou.nomor || '______/MoU/SNAPRINT/PRIN-MITRA/2026'}</div>
        </div>

        <!-- PASAL 3 -->
        <div class="mb-4">
          <div class="mou-article-header text-slate-900">
            PASAL 3: KEWAJIBAN PIHAK KEDUA
          </div>
          <div class="text-[9pt] leading-relaxed text-slate-800 space-y-2.5 text-justify pl-3">
            <p>
              PIHAK KEDUA berkewajiban untuk memenuhi persyaratan finansial dan administratif kemitraan kepada PIHAK PERTAMA yang mencakup:
            </p>
            <ol class="space-y-2 pl-4 list-decimal">
              <li>
                <strong>Pelunasan Sewa Lokasi</strong>: Menyelesaikan pembayaran sewa tempat/ruko usaha secara penuh kepada pemilik gedung sebelum tahapan pekerjaan renovasi fisik dimulai.
              </li>
              <li>
                <strong>Tahapan Pembayaran Investasi (CAPEX)</strong>: Melakukan pembayaran dana pengadaan dan fit-out outlet kepada PIHAK PERTAMA yang terbagi ke dalam 3 (tiga) tahapan berjenjang:
                <div class="overflow-hidden rounded border border-slate-300 mt-2 mb-2">
                  <table class="w-full text-left text-[8pt] border-collapse">
                    <thead>
                      <tr class="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                        <th class="p-1.5 border-r border-slate-300 w-24 text-center">Tahapan</th>
                        <th class="p-1.5 border-r border-slate-300 w-24 text-center">Persentase</th>
                        <th class="p-1.5">Keterangan &amp; Syarat Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                      ${tahap.map(t => `
                        <tr>
                          <td class="p-1.5 border-r border-slate-300 font-bold text-center bg-slate-50">${t.tahap}</td>
                          <td class="p-1.5 border-r border-slate-300 font-bold text-center text-sky-900 font-mono">${t.persentase}</td>
                          <td class="p-1.5 text-slate-700">${t.keterangan}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </li>
              <li>
                <strong>Biaya Kemitraan (Initial Fee)</strong>: Membayar Initial Franchise Fee sebesar <strong>${Calculations.formatRupiah(mou.initialFeeNominal || 100000000)} (${mou.initialFeeTerbilang || 'seratus juta rupiah'})</strong> sebagai hak lisensi penggunaan merek dagang Snaprint Digital Printing dan sistem kemitraan. Kebijakan Diskon: <span class="font-bold text-emerald-800">${mou.kebijakanDiskon || 'Tidak Ada'}</span>.
              </li>
              <li>
                <strong>Biaya Manajemen (Management Fee)</strong>: Membayar Management/Royalty Fee sebesar <strong>${mou.managementFeePercent || 5}% (${mou.managementFeePercent === 5 ? 'lima persen' : (mou.managementFeePercent + '%')})</strong> dari Total Pendapatan Kotor (Gross Revenue) bulanan yang mulai berlaku efektif pada <strong>bulan ke-${mou.managementFeeBulanMulai || 4} (${mou.managementFeeBulanMulai === 4 ? 'keempat' : mou.managementFeeBulanMulai})</strong> operasional gerai, dibayarkan selambat-lambatnya tanggal <strong>${mou.managementFeeBatasTgl || 5} (${mou.managementFeeBatasTgl === 5 ? 'lima' : mou.managementFeeBatasTgl})</strong> setiap bulannya.
              </li>
            </ol>
          </div>
        </div>

        <!-- PASAL 4 -->
        <div class="mb-4">
          <div class="mou-article-header text-slate-900">
            PASAL 4: JANGKA WAKTU DAN PERJANJIAN DEFINITIF
          </div>
          <div class="text-[9pt] leading-relaxed text-slate-800 space-y-2 text-justify pl-3">
            <p>
              1. Nota Kesepahaman ini berlaku efektif sejak tanggal ditandatangani oleh PARA PIHAK hingga ditandatanganinya Perjanjian Kerjasama (PKS) Definitif Kemitraan Snaprint Digital Printing.
            </p>
            <p>
              2. Ketentuan-ketentuan teknis operasional, standardisasi mutu, hak lisensi, pembagian dividen, dan sanksi yang belum diatur secara terperinci dalam Nota Kesepahaman ini akan dituangkan secara mengikat dalam dokumen PKS Definitif.
            </p>
          </div>
        </div>

        <!-- Penutup Resmi -->
        <div class="text-[9pt] leading-relaxed text-slate-800 mb-6 text-justify">
          <p>
            Demikian Nota Kesepahaman ini dibuat dan ditandatangani oleh PARA PIHAK dalam rangkap 2 (dua) asli bermaterai cukup, masing-masing memiliki kekuatan hukum yang sama bagi PARA PIHAK.
          </p>
        </div>

        <!-- KOLOM TANDA TANGAN BERMATERAI -->
        <div class="grid grid-cols-2 gap-8 text-center pt-2 text-[9pt]">
          <!-- Pihak Pertama -->
          <div class="flex flex-col items-center">
            <div class="font-bold text-slate-900">PIHAK PERTAMA</div>
            <div class="font-black text-slate-900 uppercase tracking-wide">${pihak1.instansi}</div>
            
            <div class="materai-box my-4 flex flex-col items-center justify-center border-dashed border-2 border-slate-400 rounded-lg p-2 bg-slate-50 text-slate-500 shadow-inner">
              <span class="font-bold text-[8.5pt] uppercase tracking-wider text-slate-600">MATERAI</span>
              <span class="text-[7.5pt] font-semibold">TEMPEL</span>
              <span class="font-mono text-[7.5pt] font-bold text-slate-700">Rp 10.000</span>
            </div>

            <div class="font-black text-slate-900 underline underline-offset-4">${pihak1.penanggungJawab}</div>
            <div class="text-[8pt] text-slate-500 mt-0.5">Pemberi Lisensi Brand Snaprint</div>
          </div>

          <!-- Pihak Kedua -->
          <div class="flex flex-col items-center">
            <div class="font-bold text-slate-900">PIHAK KEDUA</div>
            <div class="font-black text-slate-900 uppercase tracking-wide">CALON MITRA INVESTOR</div>

            <div class="materai-box my-4 flex flex-col items-center justify-center border-dashed border-2 border-slate-400 rounded-lg p-2 bg-slate-50 text-slate-500 shadow-inner">
              <span class="font-bold text-[8.5pt] uppercase tracking-wider text-slate-600">MATERAI</span>
              <span class="text-[7.5pt] font-semibold">TEMPEL</span>
              <span class="font-mono text-[7.5pt] font-bold text-slate-700">Rp 10.000</span>
            </div>

            <div class="font-black text-slate-900 underline underline-offset-4">${pihak2.nama}</div>
            <div class="text-[8pt] text-slate-500 mt-0.5">Penerima Lisensi / Pengelola Gerai</div>
          </div>
        </div>
      `;
    },

    printMouOnly() {
      const printOnlyContainer = document.getElementById('print-document-container');
      if (!printOnlyContainer) return;

      const mouHtml = `
        <!-- HALAMAN 1 DARI 2 (A4 LEGAL) -->
        <div class="print-page bg-white p-8 mb-8 text-slate-900 border border-slate-200" style="min-height: 297mm;">
          ${this.generateMouPage1Html(true)}
          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-6">
            <span>Dokumen Resmi Nota Kesepahaman (MoU) — Snaprint Digital Printing</span>
            <span>Halaman 1 dari 2</span>
          </div>
        </div>

        <div style="page-break-before: always;"></div>

        <!-- HALAMAN 2 DARI 2 (BERMATERAI) -->
        <div class="print-page bg-white p-8 mb-8 text-slate-900 border border-slate-200" style="min-height: 297mm;">
          ${this.generateMouPage2Html(true)}
          <div class="text-[7.5pt] text-slate-400 flex justify-between border-t pt-2 mt-6">
            <span>Dokumen Resmi Nota Kesepahaman (MoU) — Snaprint Digital Printing</span>
            <span>Halaman 2 dari 2 (Bermaterai Rp 10.000)</span>
          </div>
        </div>
      `;

      printOnlyContainer.innerHTML = mouHtml;
      window.print();

      // Restore full 5-page print document on finish
      setTimeout(() => {
        this.renderPrintDocument();
      }, 1000);
    },

    exportToCsv() {
      const capex = Calculations.calculateCapex(this.data);
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "RENCANA ANGGARAN BIAYA (RAB) - SNAPRINT DIGITAL PRINTING\r\n";
      csvContent += `No Dokumen: ${this.data.meta.documentNo}\r\n`;
      csvContent += `Lokasi: ${this.data.meta.outletLocation}\r\n`;
      csvContent += `Tanggal: ${this.data.meta.date}\r\n\r\n`;
      csvContent += "Kategori,Kode,Item Pekerjaan,Spesifikasi,Volume,Satuan,Harga Satuan (Rp),Potongan/Disc (Rp),Subtotal Net (Rp),Status\r\n";

      this.data.categories.forEach(cat => {
        cat.items.forEach(item => {
          const disc = Number(item.discount || 0);
          const itemNet = (item.vol * item.price) - disc;
          const row = [
            `"${cat.name}"`,
            `"${item.code}"`,
            `"${item.name.replace(/"/g, '""')}"`,
            `"${(item.spec || '').replace(/"/g, '""')}"`,
            item.vol,
            `"${item.sat}"`,
            item.price,
            disc,
            itemNet,
            `"${item.status}"`
          ];
          csvContent += row.join(",") + "\r\n";
        });
      });

      csvContent += `\r\nTOTAL ANGGARAN KOTOR (GROSS),,,,,,,,${capex.totalGross}\r\n`;
      csvContent += `TOTAL POTONGAN / DISKON,,,,,,,,${capex.totalDiscount}\r\n`;
      csvContent += `TOTAL NET ESTIMASI INVESTASI AWAL (CAPEX),,,,,,,,${capex.grandTotal}\r\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `RAB_Snaprint_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Data berhasil diekspor ke file CSV', 'success');
    },

    exportToJson() {
      const jsonStr = JSON.stringify(this.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Snaprint_RAB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showToast('Backup JSON berhasil diunduh', 'success');
    },

    importFromJson(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed && parsed.categories && parsed.workingCapital) {
            this.data = parsed;
            this.saveData();
            this.render();
            this.updateCharts();
            this.showToast('Data berhasil diimpor dari file JSON', 'success');
          } else {
            alert('Format file JSON tidak valid untuk data Snaprint RAB.');
          }
        } catch (err) {
          alert('Gagal membaca file JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      let bg = 'bg-slate-900 text-white';
      if (type === 'success') bg = 'bg-emerald-600 text-white';
      if (type === 'error') bg = 'bg-rose-600 text-white';

      toast.className = `${bg} px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
      toast.innerHTML = `
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        <span>${message}</span>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    // Live Database Inspector Methods
    inspectorActiveTab: 'json',

    openDatabaseInspector() {
      if (!this.isPrincipal()) {
        this.showToast('Akses Ditolak: Inspektur database hanya dapat diakses oleh Principal (Direksi).', 'warning');
        return;
      }
      const modal = document.getElementById('database-inspector-modal');
      const statusEl = document.getElementById('db-inspector-status');
      const timeEl = document.getElementById('db-inspector-last-update');

      if (!modal) return;

      this.switchInspectorTab(this.inspectorActiveTab || 'json');

      if (statusEl) {
        if (window.location.protocol.startsWith('http') && this.isLiveConnected) {
          statusEl.innerText = 'Status: Live Terhubung ke Server (SSE & SQL Sync Aktif)';
          statusEl.className = 'font-bold text-emerald-700';
        } else {
          statusEl.innerText = 'Status: Penyimpanan Lokal Browser & File Tersemat';
          statusEl.className = 'font-bold text-amber-700';
        }
      }

      if (timeEl) {
        timeEl.innerText = 'Terakhir Diperbarui: ' + (this.data._lastUpdated ? new Date(this.data._lastUpdated).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'));
      }

      modal.classList.remove('hidden');
    },

    closeDatabaseInspector() {
      const modal = document.getElementById('database-inspector-modal');
      if (modal) modal.classList.add('hidden');
    },

    switchInspectorTab(tab) {
      this.inspectorActiveTab = tab;
      const btnJson = document.getElementById('inspector-tab-btn-json');
      const btnSql = document.getElementById('inspector-tab-btn-sql');
      const labelEl = document.getElementById('db-inspector-label');
      const hintEl = document.getElementById('db-inspector-hint');
      const textarea = document.getElementById('db-inspector-textarea');
      const copyBtn = document.getElementById('db-inspector-copy-btn');
      const formatBtn = document.getElementById('db-inspector-format-btn');
      const saveBtn = document.getElementById('db-inspector-save-btn');

      if (!textarea) return;

      if (tab === 'sql') {
        // SQL Tab Active
        if (btnSql) {
          btnSql.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-sm flex items-center gap-1.5 transition-all';
        }
        if (btnJson) {
          btnJson.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all';
        }
        if (labelEl) {
          labelEl.innerText = 'Skrip SQL Database MySQL / MariaDB (Skema DDL, Data DML & Views):';
        }
        if (hintEl) {
          hintEl.innerHTML = 'Skrip SQL ini digenerate secara otomatis dari data aktif saat ini. Siap dieksekusi atau diimpor langsung ke phpMyAdmin, DBeaver, HeidiSQL, atau MySQL CLI.';
        }
        if (copyBtn) {
          copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin SQL';
        }
        if (formatBtn) {
          formatBtn.classList.add('hidden');
        }
        if (saveBtn) {
          saveBtn.classList.add('hidden');
        }

        const sqlDump = (window.SqlGenerator && typeof window.SqlGenerator.generateSqlDump === 'function')
          ? window.SqlGenerator.generateSqlDump(this.data)
          : '-- Generator SQL belum siap';
        textarea.value = sqlDump;
        textarea.readOnly = true;
      } else {
        // JSON Tab Active
        if (btnJson) {
          btnJson.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-sm flex items-center gap-1.5 transition-all';
        }
        if (btnSql) {
          btnSql.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all';
        }
        if (labelEl) {
          labelEl.innerText = 'Isi Database JSON (Dapat Diedit Langsung):';
        }
        if (hintEl) {
          hintEl.innerHTML = 'Setiap kali Anda menekan tombol "Simpan ke Database", file <code>data/database.json</code> dan skrip <code>database.sql</code> di disk akan diperbarui otomatis secara real-time.';
        }
        if (copyBtn) {
          copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin JSON';
        }
        if (formatBtn) {
          formatBtn.classList.remove('hidden');
        }
        if (saveBtn) {
          saveBtn.classList.remove('hidden');
        }

        textarea.value = JSON.stringify(this.data, null, 2);
        textarea.readOnly = false;
      }
    },

    saveDatabaseFromInspector() {
      const textarea = document.getElementById('db-inspector-textarea');
      if (!textarea) return;

      try {
        const parsed = JSON.parse(textarea.value);
        if (!parsed.categories || !parsed.workingCapital) {
          alert('Format JSON tidak valid: Kategori atau Modal Kerja tidak ditemukan.');
          return;
        }

        this.data = parsed;
        this.saveData(true);
        this.render();
        this.updateCharts();
        this.closeDatabaseInspector();
        this.showToast('Perubahan langsung diterapkan ke database live & SQL!', 'success');
      } catch (err) {
        alert('Gagal menyimpan database: Format JSON tidak valid (' + err.message + ')');
      }
    },

    copyInspectorContent() {
      const textarea = document.getElementById('db-inspector-textarea');
      if (!textarea) return;
      textarea.select();
      const isSql = this.inspectorActiveTab === 'sql';
      navigator.clipboard.writeText(textarea.value).then(() => {
        this.showToast(isSql ? 'Skrip SQL berhasil disalin ke clipboard' : 'JSON berhasil disalin ke clipboard', 'success');
      }).catch(() => {
        document.execCommand('copy');
        this.showToast(isSql ? 'Skrip SQL berhasil disalin' : 'JSON berhasil disalin', 'success');
      });
    },

    copyDatabaseJson() {
      this.copyInspectorContent();
    },

    formatInspectorJson() {
      const textarea = document.getElementById('db-inspector-textarea');
      if (!textarea) return;
      try {
        const parsed = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(parsed, null, 2);
        this.showToast('Format JSON berhasil dirapikan', 'info');
      } catch (err) {
        alert('Format JSON tidak valid: ' + err.message);
      }
    },

    downloadDatabaseFile() {
      const jsonStr = JSON.stringify(this.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showToast('File data/database.json berhasil diunduh', 'success');
    },

    downloadSqlFile() {
      let sqlStr = '';
      if (window.SqlGenerator && typeof window.SqlGenerator.generateSqlDump === 'function') {
        sqlStr = window.SqlGenerator.generateSqlDump(this.data);
      }

      if (!sqlStr) {
        this.showToast('Gagal membuat skrip SQL', 'error');
        return;
      }

      const blob = new Blob([sqlStr], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showToast('File database.sql berhasil diunduh', 'success');
    }
  };

  // Expose to window
  window.AppState = AppState;

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
  });
})();
