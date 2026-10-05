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
          <img src="../${escapeHtml(c.photo_url || 'assets/photo-coach.jpg')}" alt="${escapeHtml(c.name)}" class="coach-admin-img">
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
          <img src="../${escapeHtml(b.image_url || 'assets/branch-hoang-van-thu.png')}" alt="${escapeHtml(b.name)}" class="branch-admin-img">
          <div class="branch-admin-body">
            <h3>Chi nhánh ${escapeHtml(b.name)}</h3>
            <p class="muted" style="font-size:13px">📍 ${escapeHtml(b.address)}</p>
            <p style="font-size:13px">📞 Hotline: <strong>${escapeHtml(b.phone || '1900 299 991')}</strong></p>
            <p style="font-size:12px;color:var(--text-muted)">⏰ Giờ mở: ${escapeHtml(b.opening_hours)}</p>
            <div class="branch-admin-actions">
              <a href="${escapeHtml(b.map_url || '#')}" target="_blank" class="btn btn-outline btn-sm">Xem Bản Đồ</a>
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
            <img src="../${escapeHtml(b.cover_image || 'assets/blog-weight-training.jpg')}" style="width:60px;height:40px;object-fit:cover;border-radius:6px">
          </td>
          <td><strong>${escapeHtml(b.title)}</strong></td>
          <td><span class="badge-tag">${escapeHtml(b.category)}</span></td>
          <td>${escapeHtml(b.read_time)}</td>
          <td><span class="${b.is_published ? 'badge-active' : 'muted'}">${b.is_published ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
          <td>${formatDate(b.created_at)}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="showToast('Tính năng sửa bài viết')">Sửa</button>
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
