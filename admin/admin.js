// admin/admin.js — Muse Fitness Studio Admin Dashboard Controller
(function () {
  const API_BASE = '/api';
  let token = localStorage.getItem('muse_admin_token') || '';
  let currentUser = null;
  let allLeads = [];
  let editingScheduleId = null;
  let editingCoachId = null;

  const STATUS_CONFIG = {
    new: { label: 'Mới tiếp nhận', class: 'status-new' },
    contacting: { label: 'Đang liên hệ', class: 'status-contacting' },
    scheduled: { label: 'Đã hẹn tập thử', class: 'status-scheduled' },
    attended: { label: 'Đã đến tập', class: 'status-attended' },
    converted: { label: 'Đã chốt gói', class: 'status-converted' },
    cancelled: { label: 'Huỷ / Không nghe', class: 'status-cancelled' },
  };

  const IMAGE_CDN_MAP = {
    'branch-nguyen-thi-thap': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219585/muse-fitness-studio/branch-nguyen-thi-thap.webp',
    'branch-le-duc-tho': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219584/muse-fitness-studio/branch-le-duc-tho.webp',
    'branch-hoang-van-thu': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219582/muse-fitness-studio/branch-hoang-van-thu.jpg',
    'photo-coach': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219629/muse-fitness-studio/photo-coach.webp',
    'class-boxing-fit': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219589/muse-fitness-studio/class-boxing-fit.webp',
    'class-kettlebell': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219592/muse-fitness-studio/class-kettlebell.webp',
    'blog-weight-training': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219581/muse-fitness-studio/blog-weight-training.webp',
    'blog-kettlebell': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219573/muse-fitness-studio/blog-kettlebell.webp',
    'blog-need-pt': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219575/muse-fitness-studio/blog-need-pt.webp',
    'blog-postpartum': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219576/muse-fitness-studio/blog-postpartum.webp',
    'blog-protein-meal': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219578/muse-fitness-studio/blog-protein-meal.webp',
    'blog-rest-day': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219580/muse-fitness-studio/blog-rest-day.webp',
  };

  function resolveImgUrl(url, fallbackKey = 'photo-coach') {
    if (!url) return IMAGE_CDN_MAP[fallbackKey] || '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const clean = url.split('/').pop().replace(/\.[^/.]+$/, '');
    for (const [key, cdnUrl] of Object.entries(IMAGE_CDN_MAP)) {
      if (clean.includes(key)) return cdnUrl;
    }
    return url.startsWith('/') ? url : `/${url}`;
  }

  /* ==================== HTTP CLIENT ==================== */
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if (res.status === 401) {
        logout();
        throw new Error('Phiên đăng nhập đã hết hạn');
      }
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Yêu cầu không thành công');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  /* ==================== TOAST ==================== */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /* ==================== AUTH ==================== */
  async function checkAuth() {
    if (!token) {
      showLogin();
      return;
    }
    try {
      const res = await apiFetch('/auth/me');
      currentUser = res.user;
      showApp();
    } catch (e) {
      showLogin();
    }
  }

  function showLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }

  function showApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    if (currentUser) {
      document.getElementById('userNameDisplay').textContent = currentUser.name || currentUser.username;
    }
    loadDashboard();
  }

  function logout() {
    token = '';
    currentUser = null;
    localStorage.removeItem('muse_admin_token');
    showLogin();
    showToast('Đã đăng xuất khỏi hệ thống', 'success');
  }

  // Handle Login Form
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('loginError');
    errBox.style.display = 'none';

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      token = res.token;
      currentUser = res.user;
      localStorage.setItem('muse_admin_token', token);
      showApp();
      showToast('Đăng nhập thành công! Chào mừng ' + currentUser.name);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  });

  document.getElementById('btnLogout')?.addEventListener('click', logout);

  /* ==================== NAVIGATION / TABS ==================== */
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  window.switchTab = function (tabId) {
    navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabPanes.forEach((pane) => pane.classList.toggle('active', pane.id === `tab-${tabId}`));

    const titles = {
      dashboard: ['Tổng quan Studio', 'Thống kê hoạt động, lượng khách đăng ký và vận hành'],
      leads: ['Quản lý Khách hàng & Leads (CRM)', 'Chăm sóc và theo dõi tiến độ khách đăng ký tập thử'],
      schedules: ['Quản lý Lịch tập cố định', 'Lịch các lớp Boxing, Kettlebell, Yoga theo chi nhánh'],
      coaches: ['Đội ngũ Huấn luyện viên', 'Hồ sơ, chuyên môn và phong cách giảng dạy của HLV'],
      branches: ['Hệ thống Chi nhánh Studio', 'Quản lý thông tin và cơ sở vật chất của các chi nhánh'],
      pricing: ['Bảng giá & Gói tập', 'Cấu hình các gói Membership và Hành Trình 9 Tuần'],
      blogs: ['Tin tức & Blog', 'Quản lý các bài viết cẩm nang tập luyện & dinh dưỡng'],
      homepage: ['Nội dung Trang Chủ (CMS)', 'Chỉnh sửa trực quan văn bản, câu slogan, ảnh banner trang chủ'],
      settings: ['Cài đặt & Bot Thông báo', 'Tích hợp Telegram Bot và thông tin liên hệ phòng tập'],
    };

    if (titles[tabId]) {
      document.getElementById('pageTitle').textContent = titles[tabId][0];
      document.getElementById('pageSubtitle').textContent = titles[tabId][1];
    }

    // Trigger tab loader
    if (tabId === 'dashboard') loadDashboard();
    if (tabId === 'leads') loadLeads();
    if (tabId === 'schedules') loadSchedules();
    if (tabId === 'coaches') loadCoaches();
    if (tabId === 'branches') loadBranches();
    if (tabId === 'pricing') loadPricing();
    if (tabId === 'blogs') loadBlogs();
    if (tabId === 'homepage') loadHomepageCms();
    if (tabId === 'settings') loadSettings();
  };

  navItems.forEach((item) => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  /* ==================== TAB 1: DASHBOARD ==================== */
  async function loadDashboard() {
    try {
      const res = await apiFetch('/stats/dashboard');
      const stats = res.stats;

      document.getElementById('statTotalLeads').textContent = stats.totalLeads;
      document.getElementById('statLeadsToday').textContent = stats.leadsToday;
      document.getElementById('statAttendedLeads').textContent = stats.attendedLeads;
      document.getElementById('statConversionRate').textContent = `${stats.conversionRate}%`;
      document.getElementById('statConvertedCount').textContent = `${stats.convertedLeads} hợp đồng đã mua`;

      // Update badge in sidebar
      const badgeNew = document.getElementById('badgeNewLeads');
      if (badgeNew) {
        const newCount = stats.statusBreakdown.new || 0;
        badgeNew.textContent = newCount;
        badgeNew.style.display = newCount > 0 ? 'inline-block' : 'none';
      }

      // Branch breakdown
      const branchList = document.getElementById('branchBreakdownList');
      if (branchList) {
        branchList.innerHTML = stats.branchBreakdown.map((b) => {
          const pct = stats.totalLeads > 0 ? Math.round((b.count / stats.totalLeads) * 100) : 0;
          return `
            <div class="stat-item">
              <div class="stat-header">
                <span>${b.branch}</span>
                <span>${b.count} khách (${pct}%)</span>
              </div>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('') || '<p class="muted">Chưa có dữ liệu</p>';
      }

      // Source breakdown
      const sourceList = document.getElementById('sourceBreakdownList');
      if (sourceList) {
        sourceList.innerHTML = stats.sourceBreakdown.map((s) => {
          const pct = stats.totalLeads > 0 ? Math.round((s.count / stats.totalLeads) * 100) : 0;
          return `
            <div class="stat-item">
              <div class="stat-header">
                <span>${s.source}</span>
                <span>${s.count} (${pct}%)</span>
              </div>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width: ${pct}%; background: var(--gold)"></div>
              </div>
            </div>
          `;
        }).join('') || '<p class="muted">Chưa có dữ liệu</p>';
      }

      // Recent leads table
      const recentTbody = document.getElementById('recentLeadsTable');
      if (recentTbody) {
        recentTbody.innerHTML = stats.recentLeads.map((lead) => {
          const st = STATUS_CONFIG[lead.status] || { label: lead.status, class: 'status-new' };
          return `
            <tr>
              <td><strong>${escapeHtml(lead.name)}</strong></td>
              <td><code>${escapeHtml(lead.phone)}</code></td>
              <td>${escapeHtml(lead.branch || '—')}</td>
              <td>${escapeHtml(lead.goal || '—')}</td>
              <td><span class="status-badge ${st.class}">${st.label}</span></td>
              <td>${formatDate(lead.created_at)}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="openLeadDetail(${lead.id})">Chi tiết</button>
              </td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="7" class="empty-state">Chưa có khách hàng nào</td></tr>';
      }
    } catch (err) {
      showToast('Lỗi nạp thống kê dashboard', 'error');
    }
  }

  /* ==================== TAB 2: LEADS CRM ==================== */
  async function loadLeads() {
    try {
      const search = document.getElementById('leadSearchInput')?.value || '';
      const branch = document.getElementById('leadBranchFilter')?.value || 'all';
      const status = document.getElementById('leadStatusFilter')?.value || 'all';

      const query = new URLSearchParams({ search, branch, status }).toString();
      const res = await apiFetch(`/leads?${query}`);
      allLeads = res.data;

      const tbody = document.getElementById('leadsTableBody');
      const emptyState = document.getElementById('leadsEmpty');

      if (!allLeads.length) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';
      tbody.innerHTML = allLeads.map((l) => {
        const st = STATUS_CONFIG[l.status] || { label: l.status, class: 'status-new' };
        const sourceLabel = l.utm_source ? `<span class="badge-tag">${escapeHtml(l.utm_source)}</span>` : '<span class="muted">Website</span>';

        return `
          <tr>
            <td>#${l.id}</td>
            <td><strong>${escapeHtml(l.name)}</strong></td>
            <td>
              <a href="tel:${escapeHtml(l.phone)}" style="color:var(--primary);font-weight:600;text-decoration:none">${escapeHtml(l.phone)}</a>
            </td>
            <td>${escapeHtml(l.branch || '—')}</td>
            <td>
              <div>${escapeHtml(l.goal || '—')}</div>
              ${l.slot ? `<small class="muted">Khung: ${escapeHtml(l.slot)}</small>` : ''}
            </td>
            <td>${sourceLabel}</td>
            <td>
              <select class="select-input" style="padding:4px 8px;font-size:12px;font-weight:600" onchange="quickUpdateLeadStatus(${l.id}, this.value)">
                <option value="new" ${l.status === 'new' ? 'selected' : ''}>Mới tiếp nhận</option>
                <option value="contacting" ${l.status === 'contacting' ? 'selected' : ''}>Đang liên hệ</option>
                <option value="scheduled" ${l.status === 'scheduled' ? 'selected' : ''}>Đã hẹn tập</option>
                <option value="attended" ${l.status === 'attended' ? 'selected' : ''}>Đã đến tập</option>
                <option value="converted" ${l.status === 'converted' ? 'selected' : ''}>Đã chốt gói</option>
                <option value="cancelled" ${l.status === 'cancelled' ? 'selected' : ''}>Huỷ / Không nghe</option>
              </select>
            </td>
            <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(l.counselor_notes || '')}">
              ${escapeHtml(l.counselor_notes || '—')}
            </td>
            <td>${formatDate(l.created_at)}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn-table-action" onclick="openLeadDetail(${l.id})" title="Xem chi tiết & nhật ký">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn-table-action delete" onclick="deleteLead(${l.id})" title="Xóa lead">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      showToast('Lỗi tải danh sách Leads', 'error');
    }
  }

  // Quick filters listeners
  document.getElementById('leadSearchInput')?.addEventListener('input', debounce(loadLeads, 300));
  document.getElementById('leadBranchFilter')?.addEventListener('change', loadLeads);
  document.getElementById('leadStatusFilter')?.addEventListener('change', loadLeads);

  // Quick update lead status directly from select
  window.quickUpdateLeadStatus = async function (id, status) {
    try {
      await apiFetch(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast('Đã đổi trạng thái lead #' + id);
      loadDashboard();
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái', 'error');
    }
  };

  // Open Lead Detail Modal
  window.openLeadDetail = function (id) {
    const lead = allLeads.find((l) => l.id === id);
    if (!lead) return;

    document.getElementById('mLeadId').value = lead.id;
    document.getElementById('mLeadName').textContent = lead.name;
    document.getElementById('mLeadPhone').textContent = lead.phone;
    document.getElementById('mLeadEmail').textContent = lead.email || '—';
    document.getElementById('mLeadBranch').textContent = lead.branch || '—';
    document.getElementById('mLeadGoal').textContent = lead.goal || '—';
    document.getElementById('mLeadSlot').textContent = lead.slot || '—';
    document.getElementById('mLeadCustomerNote').textContent = lead.note || '—';
    document.getElementById('mLeadAttribution').textContent = lead.utm_source ? `${lead.utm_source} / campaign: ${lead.utm_campaign || 'none'}` : 'Trực tiếp website';
    document.getElementById('mLeadCreatedAt').textContent = formatDate(lead.created_at);

    document.getElementById('mLeadStatus').value = lead.status;
    document.getElementById('mCounselorNotes').value = lead.counselor_notes || '';

    openModal('leadDetailModal');
  };

  // Submit Lead Update Form
  document.getElementById('leadUpdateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('mLeadId').value;
    const status = document.getElementById('mLeadStatus').value;
    const counselor_notes = document.getElementById('mCounselorNotes').value;

    try {
      await apiFetch(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, counselor_notes }),
      });
      closeModal('leadDetailModal');
      showToast('Đã lưu nhật ký tư vấn cho khách hàng');
      loadLeads();
      loadDashboard();
    } catch (err) {
      showToast('Lỗi lưu nhật ký', 'error');
    }
  });

  // Delete lead
  window.deleteLead = async function (id) {
    if (!confirm('Nàng có chắc chắn muốn xóa khách hàng #' + id + ' không?')) return;
    try {
      await apiFetch(`/leads/${id}`, { method: 'DELETE' });
      showToast('Đã xóa lead thành công');
      loadLeads();
      loadDashboard();
    } catch (err) {
      showToast('Lỗi khi xóa lead', 'error');
    }
  };

  // Manual Add Lead Form
  document.getElementById('btnQuickAddLead')?.addEventListener('click', () => openModal('newLeadModal'));
  document.getElementById('btnOpenNewLeadModal')?.addEventListener('click', () => openModal('newLeadModal'));

  document.getElementById('manualLeadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('manLeadName').value,
      phone: document.getElementById('manLeadPhone').value,
      email: document.getElementById('manLeadEmail').value,
      branch: document.getElementById('manLeadBranch').value,
      goal: document.getElementById('manLeadGoal').value,
      slot: document.getElementById('manLeadSlot').value,
      note: document.getElementById('manLeadNote').value,
    };

    try {
      await apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeModal('newLeadModal');
      document.getElementById('manualLeadForm').reset();
      showToast('Đã tiếp nhận khách hàng mới thành công!');
      loadLeads();
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Export Leads to CSV
  document.getElementById('btnExportLeads')?.addEventListener('click', () => {
    window.location.href = `${API_BASE}/leads/export/csv`;
  });

  /* ==================== TAB 3: SCHEDULES ==================== */
  async function loadSchedules() {
    try {
      const branch = document.getElementById('scheduleBranchFilter')?.value || 'all';
      const discipline = document.getElementById('scheduleDisciplineFilter')?.value || 'all';
      const query = new URLSearchParams({ branch, discipline, includeInactive: '1' }).toString();

      const res = await apiFetch(`/schedules?${query}`);
      const list = res.data;

      const tbody = document.getElementById('schedulesTableBody');
      tbody.innerHTML = list.map((s) => `
        <tr>
          <td><strong>${escapeHtml(s.slot_time)}</strong> (${s.slot_period})</td>
          <td><strong>${escapeHtml(s.class_title)}</strong></td>
          <td><span class="badge-tag">${escapeHtml(s.discipline)}</span></td>
          <td>${escapeHtml(s.level_label || s.level)}</td>
          <td>${escapeHtml(s.branch)}</td>
          <td>${escapeHtml(s.coach_name || 'Đội ngũ HLV')}</td>
          <td>
            <span class="${s.is_active ? 'badge-active' : 'muted'}">${s.is_active ? 'Đang mở' : 'Đã ẩn'}</span>
          </td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn-table-action" onclick="openEditSchedule(${s.id})" title="Sửa">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn-table-action delete" onclick="deleteSchedule(${s.id})" title="Xoá">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="8" class="empty-state">Chưa có lớp nào</td></tr>';
    } catch (err) {
      showToast('Lỗi tải lịch tập', 'error');
    }
  }

  document.getElementById('scheduleBranchFilter')?.addEventListener('change', loadSchedules);
  document.getElementById('scheduleDisciplineFilter')?.addEventListener('change', loadSchedules);

  document.getElementById('btnOpenScheduleModal')?.addEventListener('click', () => {
    editingScheduleId = null;
    document.getElementById('scheduleModalTitle').textContent = 'Thêm Lớp tập Lịch cố định';
    document.getElementById('scheduleForm').reset();
    document.getElementById('schId').value = '';
    openModal('scheduleModal');
  });

  window.openEditSchedule = async function (id) {
    try {
      const res = await apiFetch('/schedules?includeInactive=1');
      const item = res.data.find((x) => x.id === id);
      if (!item) return;

      editingScheduleId = id;
      document.getElementById('scheduleModalTitle').textContent = 'Sửa Lịch Lớp Tập';
      document.getElementById('schId').value = item.id;
      document.getElementById('schBranch').value = item.branch;
      document.getElementById('schPeriod').value = item.slot_period;
      document.getElementById('schTime').value = item.slot_time;
      document.getElementById('schTitle').value = item.class_title;
      document.getElementById('schDiscipline').value = item.discipline;
      document.getElementById('schLevel').value = item.level;
      document.getElementById('schCoach').value = item.coach_name || '';
      document.getElementById('schDesc').value = item.desc || '';

      openModal('scheduleModal');
    } catch (err) {
      showToast('Lỗi nạp thông tin lớp tập', 'error');
    }
  };

  document.getElementById('scheduleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      branch: document.getElementById('schBranch').value,
      slot_period: document.getElementById('schPeriod').value,
      slot_time: document.getElementById('schTime').value,
      class_title: document.getElementById('schTitle').value,
      discipline: document.getElementById('schDiscipline').value,
      level: document.getElementById('schLevel').value,
      coach_name: document.getElementById('schCoach').value,
      desc: document.getElementById('schDesc').value,
    };

    try {
      if (editingScheduleId) {
        await apiFetch(`/schedules/${editingScheduleId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Đã cập nhật lịch lớp');
      } else {
        await apiFetch('/schedules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Đã thêm lịch lớp mới');
      }
      closeModal('scheduleModal');
      loadSchedules();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  window.deleteSchedule = async function (id) {
    if (!confirm('Xóa lớp học này khỏi lịch tập?')) return;
    try {
      await apiFetch(`/schedules/${id}`, { method: 'DELETE' });
      showToast('Đã xóa lớp tập');
      loadSchedules();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ==================== TAB 4: COACHES ==================== */
  async function loadCoaches() {
    try {
      const res = await apiFetch('/coaches?includeInactive=1');
      const grid = document.getElementById('coachesGrid');
      grid.innerHTML = res.data.map((c) => `
        <div class="coach-admin-card">
          <img src="${escapeHtml(resolveImgUrl(c.photo_url, 'photo-coach'))}" alt="${escapeHtml(c.name)}" class="coach-admin-img">
          <div class="coach-admin-body">
            <span class="badge-tag" style="align-self:flex-start">${escapeHtml(c.tag || 'Coach')}</span>
            <h3 style="font-size:16px">${escapeHtml(c.name)}</h3>
            <p style="font-size:13px;font-weight:600;color:var(--primary)">${escapeHtml(c.title)}</p>
            <p class="muted" style="font-size:12px">${escapeHtml(c.bio || '')}</p>
            <div class="coach-admin-specs">
              ${(c.specialities || []).map((s) => `<span class="badge-tag">${escapeHtml(s)}</span>`).join('')}
            </div>
            <div class="coach-admin-actions">
              <button class="btn btn-outline btn-sm" onclick="openEditCoach(${c.id})">Sửa</button>
              <button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="deleteCoach(${c.id})">Xoá</button>
            </div>
          </div>
        </div>
      `).join('') || '<p class="empty-state">Chưa có HLV nào</p>';
    } catch (err) {
      showToast('Lỗi tải danh sách HLV', 'error');
    }
  }

  document.getElementById('btnOpenCoachModal')?.addEventListener('click', () => {
    editingCoachId = null;
    document.getElementById('coachModalTitle').textContent = 'Thêm Huấn luyện viên mới';
    document.getElementById('coachForm').reset();
    openModal('coachModal');
  });

  window.openEditCoach = async function (id) {
    try {
      const res = await apiFetch('/coaches?includeInactive=1');
      const item = res.data.find((x) => x.id === id);
      if (!item) return;

      editingCoachId = id;
      document.getElementById('coachModalTitle').textContent = 'Sửa thông tin HLV';
      document.getElementById('coachId').value = item.id;
      document.getElementById('coachName').value = item.name;
      document.getElementById('coachTitle').value = item.title;
      document.getElementById('coachTag').value = item.tag || '';
      document.getElementById('coachPhoto').value = item.photo_url || '';
      document.getElementById('coachSpecs').value = (item.specialities || []).join(', ');
      document.getElementById('coachBio').value = item.bio || '';

      openModal('coachModal');
    } catch (err) {
      showToast('Lỗi nạp thông tin HLV', 'error');
    }
  };

  document.getElementById('coachForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawSpecs = document.getElementById('coachSpecs').value;
    const specialities = rawSpecs ? rawSpecs.split(',').map((s) => s.trim()).filter(Boolean) : [];

    const payload = {
      name: document.getElementById('coachName').value,
      title: document.getElementById('coachTitle').value,
      tag: document.getElementById('coachTag').value,
      photo_url: document.getElementById('coachPhoto').value,
      bio: document.getElementById('coachBio').value,
      specialities,
    };

    try {
      if (editingCoachId) {
        await apiFetch(`/coaches/${editingCoachId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Đã cập nhật thông tin HLV');
      } else {
        await apiFetch('/coaches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Đã thêm HLV mới');
      }
      closeModal('coachModal');
      loadCoaches();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  window.deleteCoach = async function (id) {
    if (!confirm('Xóa HLV này?')) return;
    try {
      await apiFetch(`/coaches/${id}`, { method: 'DELETE' });
      showToast('Đã xóa HLV');
      loadCoaches();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ==================== TAB 5: BRANCHES ==================== */
  async function loadBranches() {
    try {
      const res = await apiFetch('/branches?includeInactive=1');
      const grid = document.getElementById('branchesGrid');
      grid.innerHTML = res.data.map((b) => `
        <div class="branch-admin-card">
          <img src="${escapeHtml(resolveImgUrl(b.image_url, 'branch-hoang-van-thu'))}" alt="${escapeHtml(b.name)}" class="branch-admin-img">
          <div class="branch-admin-body">
            <h3>Chi nhánh ${escapeHtml(b.name)}</h3>
            <p class="muted" style="font-size:13px">📍 ${escapeHtml(b.address)}</p>
            <p style="font-size:13px">📞 Hotline: <strong>${escapeHtml(b.phone || '1900 299 991')}</strong></p>
            <p style="font-size:12px;color:var(--text-muted)">⏰ Giờ mở: ${escapeHtml(b.opening_hours)}</p>
            <div class="branch-admin-actions">
              <button class="btn btn-outline btn-sm" onclick="openEditBranch(${b.id})">Sửa</button>
              <button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="deleteBranch(${b.id})">Xóa</button>
              <a href="${escapeHtml(b.map_url || '#')}" target="_blank" class="btn btn-outline btn-sm">Bản Đồ</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      showToast('Lỗi tải danh sách chi nhánh', 'error');
    }
  }

  /* ==================== TAB 6: PRICING ==================== */
  async function loadPricing() {
    try {
      const res = await apiFetch('/pricing?includeInactive=1');
      const grid = document.getElementById('pricingGrid');
      grid.innerHTML = res.data.map((p) => `
        <div class="pricing-admin-card ${p.is_featured ? 'featured' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="badge-tag">${escapeHtml(p.badge || p.category)}</span>
            ${p.is_featured ? '<span class="badge-active">Nổi bật</span>' : ''}
          </div>
          <h3>${escapeHtml(p.name)}</h3>
          <div style="font-size:22px;font-weight:700;color:var(--primary)">
            ${escapeHtml(p.price_display)} <small style="font-size:12px;color:var(--text-muted)">${escapeHtml(p.unit)}</small>
          </div>
          <ul style="padding-left:18px;font-size:13px;display:grid;gap:6px;color:var(--text-muted)">
            ${(p.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
          <div style="margin-top:14px;display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="openEditPricing(${p.id})">Sửa</button>
            <button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="deletePricing(${p.id})">Xóa</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      showToast('Lỗi tải bảng giá', 'error');
    }
  }

  /* ==================== TAB 7: BLOGS ==================== */
  async function loadBlogs() {
    try {
      const res = await apiFetch('/blogs?includeUnpublished=1');
      const tbody = document.getElementById('blogsTableBody');
      tbody.innerHTML = res.data.map((b) => `
        <tr>
          <td>
            <img src="${escapeHtml(resolveImgUrl(b.cover_image, 'blog-weight-training'))}" style="width:60px;height:40px;object-fit:cover;border-radius:6px">
          </td>
          <td><strong>${escapeHtml(b.title)}</strong></td>
          <td><span class="badge-tag">${escapeHtml(b.category)}</span></td>
          <td>${escapeHtml(b.read_time)}</td>
          <td><span class="${b.is_published ? 'badge-active' : 'muted'}">${b.is_published ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
          <td>${formatDate(b.created_at)}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openEditBlog(${b.id})">Sửa</button>
            <button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="deleteBlog(${b.id})">Xóa</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="7" class="empty-state">Chưa có bài viết</td></tr>';
    } catch (err) {
      showToast('Lỗi tải blog', 'error');
    }
  }

  /* ==================== TAB 8: SETTINGS & TELEGRAM ==================== */
  async function loadSettings() {
    try {
      const res = await apiFetch('/settings');
      const data = res.data;

      const chk = document.getElementById('enableTelegramNotifications');
      if (chk) chk.checked = data.enable_telegram_notifications === '1';

      const tokenInp = document.getElementById('telegramBotToken');
      if (tokenInp) tokenInp.value = data.telegram_bot_token || '';

      const chatInp = document.getElementById('telegramChatId');
      if (chatInp) chatInp.value = data.telegram_chat_id || '';

      if (data.hotline) document.getElementById('studioHotline').value = data.hotline;
      if (data.email) document.getElementById('studioEmail').value = data.email;
      if (data.studio_name) document.getElementById('studioName').value = data.studio_name;
      if (data.working_hours) document.getElementById('studioHours').value = data.working_hours;

      // Cloud status
      const cloud = res.cloudStatus || {};
      const cldBadge = document.getElementById('badgeCloudinaryStatus');
      const cldName = document.getElementById('cldNameDisplay');
      if (cldBadge && cloud.cloudinary) {
        if (cloud.cloudinary.configured) {
          cldBadge.className = 'badge-active';
          cldBadge.textContent = 'Đã kết nối';
          cldName.textContent = cloud.cloudinary.cloudName;
          cldName.className = '';
        } else {
          cldBadge.className = 'badge-tag';
          cldBadge.textContent = 'Chưa cấu hình';
          cldName.textContent = 'Chưa điền trong .env';
          cldName.className = 'muted';
        }
      }

      const sbBadge = document.getElementById('badgeSupabaseStatus');
      const sbUrl = document.getElementById('sbUrlDisplay');
      if (sbBadge && cloud.supabase) {
        if (cloud.supabase.configured) {
          sbBadge.className = 'badge-active';
          sbBadge.textContent = 'Đã kết nối';
          sbUrl.textContent = cloud.supabase.url;
          sbUrl.className = '';
        } else {
          sbBadge.className = 'badge-tag';
          sbBadge.textContent = 'Chưa cấu hình';
          sbUrl.textContent = 'Chưa điền trong .env';
          sbUrl.className = 'muted';
        }
      }
    } catch (err) {
      showToast('Lỗi tải cài đặt', 'error');
    }
  }

  // Save Telegram Settings
  document.getElementById('telegramSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      enable_telegram_notifications: document.getElementById('enableTelegramNotifications').checked ? '1' : '0',
      telegram_bot_token: document.getElementById('telegramBotToken').value.trim(),
      telegram_chat_id: document.getElementById('telegramChatId').value.trim(),
    };

    try {
      await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Đã lưu cấu hình Telegram Bot thành công');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Test Telegram connection
  document.getElementById('btnTestTelegram')?.addEventListener('click', async () => {
    try {
      showToast('Đang gửi tin nhắn thử nghiệm...', 'success');
      const res = await apiFetch('/settings/test-telegram', { method: 'POST' });
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Test Cloudinary connection
  document.getElementById('btnTestCloudinary')?.addEventListener('click', async () => {
    try {
      showToast('Đang kiểm tra kết nối Cloudinary...', 'success');
      const res = await apiFetch('/settings/test-cloudinary', { method: 'POST' });
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Test Supabase connection
  document.getElementById('btnTestSupabase')?.addEventListener('click', async () => {
    try {
      showToast('Đang kiểm tra kết nối Supabase...', 'success');
      const res = await apiFetch('/settings/test-supabase', { method: 'POST' });
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Sync sample data to Supabase
  document.getElementById('btnSyncSupabase')?.addEventListener('click', async () => {
    if (!confirm('Bạn có muốn đồng bộ toàn bộ dữ liệu mẫu (Chi nhánh, HLV, Lịch tập, Gói tập, Leads) lên Supabase không?')) return;
    try {
      showToast('Đang đồng bộ dữ liệu lên Supabase...', 'success');
      const res = await apiFetch('/settings/sync-supabase', { method: 'POST' });
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Save Studio Settings
  document.getElementById('studioSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      studio_name: document.getElementById('studioName').value.trim(),
      hotline: document.getElementById('studioHotline').value.trim(),
      email: document.getElementById('studioEmail').value.trim(),
      working_hours: document.getElementById('studioHours').value.trim(),
    };

    try {
      await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Đã lưu thông tin phòng tập');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  /* ==================== CLOUDINARY DIRECT UPLOADER ==================== */
  let activeUploadTargetInputId = null;

  window.triggerDirectUpload = function (targetInputId) {
    activeUploadTargetInputId = targetInputId;
    const fileInput = document.getElementById('globalDirectUploader');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  };

  document.getElementById('globalDirectUploader')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTargetInputId) return;

    showToast('Đang tải ảnh lên Cloudinary...', 'success');
    try {
      const signRes = await apiFetch('/cloudinary/sign', { method: 'POST' });
      if (!signRes.ok) throw new Error(signRes.error || 'Lỗi xác thực tải ảnh Cloudinary');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signRes.apiKey);
      formData.append('timestamp', signRes.timestamp);
      formData.append('signature', signRes.signature);
      formData.append('folder', signRes.folder);

      const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${signRes.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const cldData = await cldRes.json();
      if (!cldRes.ok || cldData.error) {
        throw new Error(cldData.error?.message || 'Lỗi tải ảnh lên Cloudinary');
      }

      const targetInput = document.getElementById(activeUploadTargetInputId);
      if (targetInput) {
        targetInput.value = cldData.secure_url;
      }
      showToast('Tải ảnh thành công!');
    } catch (err) {
      console.error('Direct upload error:', err);
      showToast(err.message, 'error');
    }
  });

  /* ==================== BRANCH MODAL & ACTIONS ==================== */
  let editingBranchId = null;

  document.getElementById('btnOpenBranchModal')?.addEventListener('click', () => {
    editingBranchId = null;
    document.getElementById('branchModalTitle').textContent = 'Thêm Chi nhánh mới';
    document.getElementById('branchForm').reset();
    openModal('branchModal');
  });

  window.openEditBranch = async function (id) {
    try {
      const res = await apiFetch('/branches?includeInactive=1');
      const item = res.data.find((x) => x.id === id);
      if (!item) return;

      editingBranchId = id;
      document.getElementById('branchModalTitle').textContent = 'Sửa thông tin Chi nhánh';
      document.getElementById('branchId').value = item.id;
      document.getElementById('branchName').value = item.name;
      document.getElementById('branchAddress').value = item.address;
      document.getElementById('branchPhone').value = item.phone || '';
      document.getElementById('branchHours').value = item.opening_hours || '';
      document.getElementById('branchMap').value = item.map_url || '';
      document.getElementById('branchImage').value = item.image_url || '';
      openModal('branchModal');
    } catch (err) {
      showToast('Lỗi nạp thông tin chi nhánh', 'error');
    }
  };

  document.getElementById('branchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('branchName').value.trim(),
      slug: document.getElementById('branchName').value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
      address: document.getElementById('branchAddress').value.trim(),
      phone: document.getElementById('branchPhone').value.trim(),
      opening_hours: document.getElementById('branchHours').value.trim(),
      map_url: document.getElementById('branchMap').value.trim(),
      image_url: document.getElementById('branchImage').value.trim(),
    };

    try {
      if (editingBranchId) {
        await apiFetch(`/branches/${editingBranchId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Đã cập nhật chi nhánh');
      } else {
        await apiFetch('/branches', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Đã thêm chi nhánh mới');
      }
      closeModal('branchModal');
      loadBranches();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  window.deleteBranch = async function (id) {
    if (!confirm('Xóa chi nhánh này?')) return;
    try {
      await apiFetch(`/branches/${id}`, { method: 'DELETE' });
      showToast('Đã xóa chi nhánh');
      loadBranches();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ==================== PRICING MODAL & ACTIONS ==================== */
  let editingPricingId = null;

  document.getElementById('btnOpenPricingModal')?.addEventListener('click', () => {
    editingPricingId = null;
    document.getElementById('pricingModalTitle').textContent = 'Thêm Gói tập mới';
    document.getElementById('pricingForm').reset();
    openModal('pricingModal');
  });

  window.openEditPricing = async function (id) {
    try {
      const res = await apiFetch('/pricing?includeInactive=1');
      const item = res.data.find((x) => x.id === id);
      if (!item) return;

      editingPricingId = id;
      document.getElementById('pricingModalTitle').textContent = 'Sửa thông tin Gói tập';
      document.getElementById('pricingId').value = item.id;
      document.getElementById('pricingCategory').value = item.category;
      document.getElementById('pricingName').value = item.name;
      document.getElementById('pricingDisplay').value = item.price_display;
      document.getElementById('pricingUnit').value = item.unit;
      document.getElementById('pricingBadge').value = item.badge || '';
      document.getElementById('pricingFeatures').value = (item.features || []).join('\n');
      openModal('pricingModal');
    } catch (err) {
      showToast('Lỗi nạp thông tin gói tập', 'error');
    }
  };

  document.getElementById('pricingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const featText = document.getElementById('pricingFeatures').value.trim();
    const payload = {
      category: document.getElementById('pricingCategory').value,
      name: document.getElementById('pricingName').value.trim(),
      price_display: document.getElementById('pricingDisplay').value.trim(),
      unit: document.getElementById('pricingUnit').value.trim(),
      badge: document.getElementById('pricingBadge').value.trim(),
      features: featText ? featText.split('\n').map((s) => s.trim()).filter(Boolean) : [],
    };

    try {
      if (editingPricingId) {
        await apiFetch(`/pricing/${editingPricingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Đã cập nhật gói tập');
      } else {
        await apiFetch('/pricing', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Đã thêm gói tập mới');
      }
      closeModal('pricingModal');
      loadPricing();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  window.deletePricing = async function (id) {
    if (!confirm('Xóa gói tập này?')) return;
    try {
      await apiFetch(`/pricing/${id}`, { method: 'DELETE' });
      showToast('Đã xóa gói tập');
      loadPricing();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ==================== BLOG MODAL & ACTIONS ==================== */
  let editingBlogId = null;

  document.getElementById('btnOpenBlogModal')?.addEventListener('click', () => {
    editingBlogId = null;
    document.getElementById('blogModalTitle').textContent = 'Viết Bài Blog mới';
    document.getElementById('blogForm').reset();
    openModal('blogModal');
  });

  window.openEditBlog = async function (id) {
    try {
      const res = await apiFetch('/blogs?includeUnpublished=1');
      const item = res.data.find((x) => x.id === id);
      if (!item) return;

      editingBlogId = id;
      document.getElementById('blogModalTitle').textContent = 'Sửa Bài viết';
      document.getElementById('blogId').value = item.id;
      document.getElementById('blogTitle').value = item.title;
      document.getElementById('blogCategory').value = item.category;
      document.getElementById('blogReadTime').value = item.read_time || '5 phút';
      document.getElementById('blogCoverImage').value = item.cover_image || '';
      document.getElementById('blogSummary').value = item.summary || '';
      document.getElementById('blogContent').value = item.content || '';
      openModal('blogModal');
    } catch (err) {
      showToast('Lỗi nạp bài viết', 'error');
    }
  };

  document.getElementById('blogForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('blogTitle').value.trim();
    const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const payload = {
      title,
      slug,
      category: document.getElementById('blogCategory').value,
      read_time: document.getElementById('blogReadTime').value.trim() || '5 phút',
      cover_image: document.getElementById('blogCoverImage').value.trim(),
      summary: document.getElementById('blogSummary').value.trim(),
      content: document.getElementById('blogContent').value.trim(),
      is_published: 1,
    };

    try {
      if (editingBlogId) {
        await apiFetch(`/blogs/${editingBlogId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Đã cập nhật bài viết');
      } else {
        await apiFetch('/blogs', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Đã xuất bản bài viết');
      }
      closeModal('blogModal');
      loadBlogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  window.deleteBlog = async function (id) {
    if (!confirm('Xóa bài viết này?')) return;
    try {
      await apiFetch(`/blogs/${id}`, { method: 'DELETE' });
      showToast('Đã xóa bài viết');
      loadBlogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ==================== HOMEPAGE CMS LOADER & SAVERS ==================== */
  async function loadHomepageCms() {
    try {
      const res = await apiFetch('/settings');
      const data = res.data || {};

      // Hero
      if (data.home_hero) {
        const h = data.home_hero;
        if (document.getElementById('heroEyebrow')) document.getElementById('heroEyebrow').value = h.eyebrow || '';
        if (document.getElementById('heroHeadline')) document.getElementById('heroHeadline').value = h.headline || '';
        if (document.getElementById('heroLead')) document.getElementById('heroLead').value = h.lead || '';
        if (document.getElementById('heroCtaText')) document.getElementById('heroCtaText').value = h.cta_text || '';
        if (document.getElementById('heroCtaLink')) document.getElementById('heroCtaLink').value = h.cta_link || '';
        if (document.getElementById('heroImage')) document.getElementById('heroImage').value = h.hero_image || '';
      }

      // Philosophy & Socials
      if (data.home_philosophy && document.getElementById('philQuote')) {
        document.getElementById('philQuote').value = data.home_philosophy.quote || '';
      }
      if (document.getElementById('socZalo')) document.getElementById('socZalo').value = data.zalo_url || '';
      if (document.getElementById('socFacebook')) document.getElementById('socFacebook').value = data.facebook_url || '';
      if (document.getElementById('socInstagram')) document.getElementById('socInstagram').value = data.instagram_url || '';
      if (document.getElementById('socTiktok')) document.getElementById('socTiktok').value = data.tiktok_url || '';

      // 9-Week Journey
      if (data.home_journey_9w) {
        const j = data.home_journey_9w;
        if (document.getElementById('jStep1Title')) document.getElementById('jStep1Title').value = j.step1_title || '';
        if (document.getElementById('jStep1Desc')) document.getElementById('jStep1Desc').value = j.step1_desc || '';
        if (document.getElementById('jStep2Title')) document.getElementById('jStep2Title').value = j.step2_title || '';
        if (document.getElementById('jStep2Desc')) document.getElementById('jStep2Desc').value = j.step2_desc || '';
        if (document.getElementById('jStep3Title')) document.getElementById('jStep3Title').value = j.step3_title || '';
        if (document.getElementById('jStep3Desc')) document.getElementById('jStep3Desc').value = j.step3_desc || '';
      }
    } catch (err) {
      showToast('Lỗi nạp cấu hình trang chủ', 'error');
    }
  }

  // Save Home Hero
  document.getElementById('homeHeroForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      home_hero: {
        eyebrow: document.getElementById('heroEyebrow').value.trim(),
        headline: document.getElementById('heroHeadline').value.trim(),
        lead: document.getElementById('heroLead').value.trim(),
        cta_text: document.getElementById('heroCtaText').value.trim(),
        cta_link: document.getElementById('heroCtaLink').value.trim(),
        hero_image: document.getElementById('heroImage').value.trim(),
      },
    };
    try {
      await apiFetch('/settings', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Đã lưu nội dung Hero Banner');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Save Philosophy & Socials
  document.getElementById('homePhilosophyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      home_philosophy: {
        quote: document.getElementById('philQuote').value.trim(),
      },
      zalo_url: document.getElementById('socZalo').value.trim(),
      facebook_url: document.getElementById('socFacebook').value.trim(),
      instagram_url: document.getElementById('socInstagram').value.trim(),
      tiktok_url: document.getElementById('socTiktok').value.trim(),
    };
    try {
      await apiFetch('/settings', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Đã lưu triết lý & mạng xã hội');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Save Journey Steps
  document.getElementById('homeJourneyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      home_journey_9w: {
        step1_title: document.getElementById('jStep1Title').value.trim(),
        step1_desc: document.getElementById('jStep1Desc').value.trim(),
        step2_title: document.getElementById('jStep2Title').value.trim(),
        step2_desc: document.getElementById('jStep2Desc').value.trim(),
        step3_title: document.getElementById('jStep3Title').value.trim(),
        step3_desc: document.getElementById('jStep3Desc').value.trim(),
      },
    };
    try {
      await apiFetch('/settings', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Đã lưu Lộ trình 9 Tuần');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  /* ==================== MODAL UTILS ==================== */
  window.openModal = function (modalId) {
    document.getElementById(modalId)?.classList.add('is-open');
  };

  window.closeModal = function (modalId) {
    document.getElementById(modalId)?.classList.remove('is-open');
  };

  // Close modals on outside click
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('is-open');
    });
  });

  /* ==================== HELPERS ==================== */
  function formatDate(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function debounce(fn, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Init auth check on load
  checkAuth();
})();
