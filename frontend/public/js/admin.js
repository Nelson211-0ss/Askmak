(function() {
  var lastActivity = Date.now();
  var INACTIVITY_MS = 30 * 60 * 1000;
  var pollTimer = null;
  var charts = { conv: null, cat: null, hour: null };

  function touch() { lastActivity = Date.now(); }

  function adminFetch(path, opts) {
    touch();
    opts = opts || {};
    opts.credentials = 'include';
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      opts.headers = opts.headers || {};
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    return fetch('/api/admin' + path, opts).then(function(res) {
      if (res.status === 401) { window.location.href = '/login.html'; return Promise.reject(); }
      if (res.status === 403) { window.location.href = '/chat.html'; return Promise.reject(); }
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('application/json') >= 0) return res.json().then(function(j) {
        if (!res.ok) throw new Error(j.error || 'Request failed');
        return j;
      });
      if (!res.ok) throw new Error('Request failed');
      return res.text();
    });
  }

  function destroyCharts() {
    ['conv', 'cat', 'hour'].forEach(function(k) {
      if (charts[k]) { charts[k].destroy(); charts[k] = null; }
    });
  }

  function setActiveNav(section) {
    document.querySelectorAll('.admin-nav').forEach(function(btn) {
      btn.removeAttribute('data-active');
      if (btn.getAttribute('data-section') === section) btn.setAttribute('data-active', 'true');
    });
    document.getElementById('section-title').textContent =
      { overview: 'Overview', escalations: 'Escalations', unresolved: 'Unresolved', users: 'Users',
        conversations: 'Conversations', feedback: 'Feedback', documents: 'Knowledge base',
        reference: 'Reference images', ingest: 'Ingestion', settings: 'Settings' }[section] || section;
  }

  function openModal(title, html) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('admin-modal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('admin-modal').classList.add('hidden');
  }

  function escBadge(n) {
    var el = document.getElementById('nav-esc-count');
    if (!el) return;
    if (n > 0) { el.textContent = String(n); el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
  }

  function loadOverview() {
    destroyCharts();
    var main = document.getElementById('admin-main');
    main.innerHTML = '<div class="text-gray-500">Loading…</div>';
    Promise.all([
      adminFetch('/stats'),
      adminFetch('/stats/timeseries?days=30'),
      adminFetch('/stats/categories'),
      adminFetch('/stats/messages-by-hour'),
      adminFetch('/activity/recent?limit=20')
    ]).then(function(results) {
      var s = results[0];
      var ts = results[1].points || [];
      var cats = results[2].categories || [];
      var hours = results[3].hours || [];
      var activity = results[4].chats || [];
      escBadge(s.pending_escalations || 0);

      var cards = [
        { label: 'Chats today', v: s.conversations_today },
        { label: 'Chats (7d)', v: s.conversations_week },
        { label: 'Chats (30d)', v: s.conversations_month },
        { label: 'Active users (7d)', v: s.active_users_7d },
        { label: 'Guest sessions (7d)', v: s.guest_sessions_week },
        { label: 'Pending escalations', v: s.pending_escalations, red: (s.pending_escalations || 0) > 0 },
        { label: 'Avg confidence today', v: s.avg_confidence_today != null ? s.avg_confidence_today.toFixed(3) : '—' },
        { label: 'Est. API cost (month)', v: '$' + (s.estimated_api_cost_month_usd || 0) }
      ];

      var html = '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">';
      cards.forEach(function(c) {
        html += '<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">';
        html += '<div class="text-xs text-gray-500 dark:text-gray-400 mb-1">' + Utils.escapeHtml(c.label) + '</div>';
        html += '<div class="text-2xl font-bold ' + (c.red ? 'text-mak-red' : 'text-mak-dark dark:text-white') + '">' + Utils.escapeHtml(String(c.v)) + '</div></div>';
      });
      html += '</div><div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">';
      html += '<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><canvas id="chart-conv" height="200"></canvas></div>';
      html += '<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><canvas id="chart-cat" height="200"></canvas></div>';
      html += '<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><canvas id="chart-hour" height="200"></canvas></div>';
      html += '</div><h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent activity</h2>';
      html += '<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">';
      if (!activity.length) html += '<div class="p-4 text-gray-500 text-sm">No chats yet</div>';
      activity.forEach(function(ch) {
        var who = ch.user_id ? (Utils.escapeHtml(ch.full_name || ch.email || 'User')) : 'Guest';
        var badge = ch.escalated ? '<span class="text-xs bg-mak-red/15 text-mak-red px-2 py-0.5 rounded">Escalated</span>' : '<span class="text-xs bg-mak-green/15 text-mak-green px-2 py-0.5 rounded">Active</span>';
        var prev = Utils.truncate(ch.first_message || '', 80);
        html += '<button type="button" class="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex gap-3 items-start admin-open-chat" data-id="' + ch.id + '">';
        html += '<div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-0.5"><span class="font-medium text-sm">' + Utils.escapeHtml(ch.title || 'Chat') + '</span>' + badge + '</div>';
        html += '<div class="text-xs text-gray-500">' + who + ' · ' + Utils.formatTime(ch.updated_at) + '</div>';
        html += '<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">' + Utils.escapeHtml(prev) + '</div></div></button>';
      });
      html += '</div>';
      main.innerHTML = html;

      var labels = ts.map(function(p) { return p.d; });
      var data = ts.map(function(p) { return p.c; });
      charts.conv = new Chart(document.getElementById('chart-conv'), {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Chats per day', data: data, borderColor: '#00a651', tension: 0.2 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
      charts.cat = new Chart(document.getElementById('chart-cat'), {
        type: 'doughnut',
        data: {
          labels: cats.map(function(c) { return c.category; }),
          datasets: [{ data: cats.map(function(c) { return c.count; }), backgroundColor: ['#00a651', '#231F20', '#d2ab67', '#ed1c24', '#6b7280', '#9ca3af'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
      var hLabels = hours.map(function(h) { return h.h + ':00'; });
      var hData = hours.map(function(h) { return h.c; });
      charts.hour = new Chart(document.getElementById('chart-hour'), {
        type: 'bar',
        data: { labels: hLabels, datasets: [{ label: 'Messages by hour', data: hData, backgroundColor: '#231F20' }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });

      main.querySelectorAll('.admin-open-chat').forEach(function(btn) {
        btn.addEventListener('click', function() { openConversationModal(btn.getAttribute('data-id')); });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed to load overview</p>'; });
  }

  function openConversationModal(id) {
    adminFetch('/conversations/' + id).then(function(d) {
      var msgs = d.messages || [];
      var html = '<div class="space-y-2">';
      msgs.forEach(function(m) {
        var role = m.role;
        var bubble = role === 'user' ? 'bg-mak-green/15' : role === 'assistant' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-mak-gold/10';
        html += '<div class="rounded-lg p-2 ' + bubble + '"><span class="text-xs font-semibold uppercase text-gray-500">' + role + '</span>';
        html += '<div class="prose prose-sm prose-sans dark:prose-invert max-w-none">' + (role === 'assistant' ? Utils.renderMarkdown(m.content || '') : Utils.escapeHtml(m.content || '')) + '</div>';
        if (m.image_url) html += '<img src="' + Utils.escapeHtml(m.image_url) + '" class="mt-2 max-h-40 rounded cursor-pointer" onclick="Utils.openLightbox(this.src)">';
        html += '</div>';
      });
      html += '</div>';
      openModal(d.chat.title || 'Conversation', html);
    }).catch(function() { Utils.showToast('Failed to load chat', 'error'); });
  }

  function loadEscalations(statusFilter) {
    var main = document.getElementById('admin-main');
    main.innerHTML = 'Loading…';
    var qs = '/escalations?limit=50';
    if (statusFilter) qs += '&status=' + encodeURIComponent(statusFilter);
    adminFetch(qs).then(function(d) {
      var rows = d.escalations || [];
      var html = '<div class="flex flex-wrap gap-2 mb-4"><select id="esc-filter" class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">';
      ['', 'pending', 'in_progress', 'resolved', 'dismissed'].forEach(function(s) {
        var sel = statusFilter === s ? ' selected' : '';
        html += '<option value="' + s + '"' + sel + '>' + (s || 'All statuses') + '</option>';
      });
      html += '</select></div><div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"><table class="min-w-full text-sm"><thead><tr class="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">';
      html += '<th class="p-3">Date</th><th class="p-3">User</th><th class="p-3">Preview</th><th class="p-3">Status</th><th class="p-3"></th></tr></thead><tbody>';
      rows.forEach(function(e) {
        var who = e.user_name || (e.user_email ? e.user_email : 'Guest');
        html += '<tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">';
        html += '<td class="p-3 whitespace-nowrap">' + Utils.formatTime(e.created_at) + '</td>';
        html += '<td class="p-3">' + Utils.escapeHtml(who) + '</td>';
        html += '<td class="p-3 max-w-xs truncate">' + Utils.escapeHtml(Utils.truncate(e.message_content || '', 60)) + '</td>';
        html += '<td class="p-3"><span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">' + e.status + '</span></td>';
        html += '<td class="p-3"><button type="button" class="text-mak-green text-xs font-medium admin-esc-open" data-id="' + e.id + '">View</button></td></tr>';
      });
      html += '</tbody></table></div>';
      if (!rows.length) html = '<p class="text-gray-500">No escalations</p>';
      main.innerHTML = html;
      var selEl = document.getElementById('esc-filter');
      if (selEl) selEl.addEventListener('change', function() { loadEscalations(selEl.value || null); });
      main.querySelectorAll('.admin-esc-open').forEach(function(btn) {
        btn.addEventListener('click', function() { openEscalationDetail(btn.getAttribute('data-id')); });
      });
      adminFetch('/stats').then(function(s) { escBadge(s.pending_escalations || 0); }).catch(function() {});
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed to load</p>'; });
  }

  function openEscalationDetail(id) {
    adminFetch('/escalations/' + id).then(function(d) {
      var esc = d.escalation;
      var msgs = d.messages || [];
      var html = '<p class="mb-2"><strong>Reason:</strong> ' + Utils.escapeHtml(esc.reason || '—') + '</p>';
      html += '<div class="space-y-2 max-h-[60vh] overflow-y-auto thin-scroll">';
      msgs.forEach(function(m) {
        var hl = m.id === esc.message_id ? ' ring-2 ring-mak-red' : '';
        html += '<div class="rounded-lg p-2 bg-gray-50 dark:bg-gray-800' + hl + '"><span class="text-xs uppercase text-gray-500">' + m.role + '</span>';
        html += '<div class="text-sm">' + (m.role === 'assistant' ? Utils.renderMarkdown(m.content || '') : Utils.escapeHtml(m.content || '')) + '</div></div>';
      });
      html += '</div><div class="mt-4 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">';
      html += '<textarea id="esc-admin-note" rows="2" class="w-full border rounded-lg p-2 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" placeholder="Admin response to user…"></textarea>';
      html += '<div class="flex flex-wrap gap-2">';
      html += '<button type="button" class="admin-esc-patch px-3 py-2 rounded-lg bg-mak-green text-white text-sm" data-id="' + id + '" data-status="resolved">Resolve with response</button>';
      html += '<button type="button" class="admin-esc-patch px-3 py-2 rounded-lg border text-sm" data-id="' + id + '" data-status="in_progress">In progress</button>';
      html += '<button type="button" class="admin-esc-patch px-3 py-2 rounded-lg border text-sm" data-id="' + id + '" data-status="dismissed">Dismiss</button>';
      html += '</div></div>';
      openModal('Escalation', html);
      document.querySelectorAll('.admin-esc-patch').forEach(function(b) {
        b.addEventListener('click', function() {
          var st = b.getAttribute('data-status');
          var note = document.getElementById('esc-admin-note');
          var body = { status: st };
          if (note && note.value.trim()) body.admin_response = note.value.trim();
          adminFetch('/escalations/' + b.getAttribute('data-id'), { method: 'PATCH', body: body }).then(function() {
            Utils.showToast('Updated', 'success');
            closeModal();
            loadEscalations(null);
          }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
        });
      });
    });
  }

  function loadUnresolved() {
    var main = document.getElementById('admin-main');
    adminFetch('/unresolved?limit=100').then(function(d) {
      var items = d.items || [];
      var html = '<p class="text-sm text-gray-500 mb-4">Assistant messages with low confidence or hedge phrases.</p>';
      html += '<div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"><table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500"><th class="p-3">When</th><th class="p-3">User</th><th class="p-3">Excerpt</th><th class="p-3">Conf</th><th class="p-3"></th></tr></thead><tbody>';
      items.forEach(function(m) {
        var who = m.full_name || m.email || 'Guest';
        html += '<tr class="border-b border-gray-100 dark:border-gray-800"><td class="p-3 whitespace-nowrap">' + Utils.formatTime(m.created_at) + '</td>';
        html += '<td class="p-3">' + Utils.escapeHtml(who) + '</td>';
        html += '<td class="p-3 max-w-md truncate">' + Utils.escapeHtml(Utils.truncate(m.content || '', 100)) + '</td>';
        html += '<td class="p-3">' + (m.confidence_score != null ? m.confidence_score.toFixed(2) : '—') + '</td>';
        html += '<td class="p-3 space-x-2 whitespace-nowrap"><button type="button" class="text-mak-green text-xs admin-open-chat" data-id="' + m.chat_id + '">Chat</button>';
        html += '<button type="button" class="text-xs text-gray-600 dark:text-gray-400 admin-unres-dismiss" data-mid="' + m.id + '">Dismiss</button>';
        html += '<button type="button" class="text-xs text-mak-red admin-unres-esc" data-mid="' + m.id + '">Escalate</button></td></tr>';
      });
      html += '</tbody></table></div>';
      if (!items.length) html = '<p class="text-gray-500">No unresolved items detected</p>';
      main.innerHTML = html;
      main.querySelectorAll('.admin-open-chat').forEach(function(btn) {
        btn.addEventListener('click', function() { openConversationModal(btn.getAttribute('data-id')); });
      });
      main.querySelectorAll('.admin-unres-dismiss').forEach(function(btn) {
        btn.addEventListener('click', function() {
          adminFetch('/unresolved/' + btn.getAttribute('data-mid'), { method: 'PATCH', body: { action: 'dismiss' } }).then(function() {
            Utils.showToast('Dismissed', 'success');
            loadUnresolved();
          }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
        });
      });
      main.querySelectorAll('.admin-unres-esc').forEach(function(btn) {
        btn.addEventListener('click', function() {
          adminFetch('/unresolved/' + btn.getAttribute('data-mid'), { method: 'PATCH', body: { action: 'escalate' } }).then(function() {
            Utils.showToast('Escalation created', 'success');
            loadUnresolved();
          }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
        });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadUsers() {
    var main = document.getElementById('admin-main');
    adminFetch('/users?limit=100').then(function(d) {
      var rows = d.users || [];
      var html = '<div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"><table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">';
      html += '<th class="p-3">Name</th><th class="p-3">Email</th><th class="p-3">Verified</th><th class="p-3">Chats</th><th class="p-3"></th></tr></thead><tbody>';
      rows.forEach(function(u) {
        html += '<tr class="border-b border-gray-100 dark:border-gray-800"><td class="p-3">' + Utils.escapeHtml(u.full_name) + '</td>';
        html += '<td class="p-3">' + Utils.escapeHtml(u.email) + '</td>';
        html += '<td class="p-3">' + (u.email_verified ? 'Yes' : 'No') + '</td>';
        html += '<td class="p-3">' + (u.chat_count || 0) + '</td>';
        html += '<td class="p-3"><button type="button" class="text-xs text-mak-green admin-user-open" data-id="' + u.id + '">View</button>';
        if (u.role !== 'admin') html += ' <button type="button" class="text-xs text-mak-red admin-user-del" data-id="' + u.id + '">Delete</button>';
        html += '</td></tr>';
      });
      html += '</tbody></table></div>';
      main.innerHTML = html;
      main.querySelectorAll('.admin-user-open').forEach(function(btn) {
        btn.addEventListener('click', function() {
          adminFetch('/users/' + btn.getAttribute('data-id')).then(function(ud) {
            var u = ud.user;
            var mh = '<p><strong>' + Utils.escapeHtml(u.full_name) + '</strong><br>' + Utils.escapeHtml(u.email) + '</p>';
            mh += '<p class="text-xs text-gray-500">Memories: ' + (ud.memories || []).length + '</p>';
            openModal('User', mh);
          });
        });
      });
      main.querySelectorAll('.admin-user-del').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (!confirm('Delete this user?')) return;
          adminFetch('/users/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(function() {
            Utils.showToast('Deleted', 'success');
            loadUsers();
          }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
        });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadConversations() {
    var main = document.getElementById('admin-main');
    adminFetch('/conversations?limit=50').then(function(d) {
      var rows = d.conversations || [];
      var html = '<div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"><table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">';
      html += '<th class="p-3">Updated</th><th class="p-3">Title</th><th class="p-3">Who</th><th class="p-3">Msgs</th><th class="p-3"></th></tr></thead><tbody>';
      rows.forEach(function(c) {
        var who = c.user_id ? (c.full_name || c.email || 'User') : 'Guest';
        html += '<tr class="border-b border-gray-100 dark:border-gray-800"><td class="p-3 whitespace-nowrap">' + Utils.formatTime(c.updated_at) + '</td>';
        html += '<td class="p-3">' + Utils.escapeHtml(c.title || '') + '</td><td class="p-3">' + Utils.escapeHtml(who) + '</td>';
        html += '<td class="p-3">' + (c.message_count || 0) + '</td>';
        html += '<td class="p-3"><button type="button" class="text-mak-green text-xs admin-open-chat" data-id="' + c.id + '">View</button></td></tr>';
      });
      html += '</tbody></table></div>';
      main.innerHTML = html;
      main.querySelectorAll('.admin-open-chat').forEach(function(btn) {
        btn.addEventListener('click', function() { openConversationModal(btn.getAttribute('data-id')); });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadFeedback() {
    var main = document.getElementById('admin-main');
    adminFetch('/feedback?limit=100').then(function(d) {
      var rows = d.feedback || [];
      var html = '<button type="button" id="fb-export" class="inline-block mb-4 text-sm text-mak-green font-medium hover:underline bg-transparent border-none cursor-pointer p-0">Download CSV</button>';
      html += '<div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"><table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">';
      html += '<th class="p-3">Date</th><th class="p-3">Rating</th><th class="p-3">Preview</th></tr></thead><tbody>';
      rows.forEach(function(f) {
        html += '<tr class="border-b border-gray-100 dark:border-gray-800"><td class="p-3">' + Utils.formatTime(f.created_at) + '</td>';
        html += '<td class="p-3">' + (f.rating ? 'Up' : 'Down') + '</td>';
        html += '<td class="p-3 truncate max-w-md">' + Utils.escapeHtml(Utils.truncate(f.message_preview || '', 80)) + '</td></tr>';
      });
      html += '</tbody></table></div>';
      main.innerHTML = html;
      var ex = document.getElementById('fb-export');
      if (ex) ex.addEventListener('click', function() {
        fetch('/api/admin/feedback/export', { credentials: 'include' }).then(function(res) {
          if (!res.ok) throw new Error('Export failed');
          return res.blob();
        }).then(function(blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'askmak-feedback.csv';
          a.click();
          URL.revokeObjectURL(a.href);
        }).catch(function() { Utils.showToast('Export failed', 'error'); });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadDocuments() {
    var main = document.getElementById('admin-main');
    adminFetch('/documents?limit=50').then(function(d) {
      var rows = d.documents || [];
      var html = '<div class="grid md:grid-cols-2 gap-4 mb-6"><div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">';
      html += '<h3 class="font-semibold mb-2 text-sm">Add FAQ / article</h3>';
      html += '<input id="doc-title" placeholder="Title" class="w-full mb-2 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">';
      html += '<textarea id="doc-body" rows="4" placeholder="Content" class="w-full mb-2 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"></textarea>';
      html += '<input id="doc-cat" placeholder="Category (e.g. faq)" class="w-full mb-2 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">';
      html += '<button type="button" id="doc-save" class="w-full py-2 rounded-lg bg-mak-green text-white text-sm font-medium">Save & embed</button></div>';
      html += '<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm text-gray-600 dark:text-gray-400">Chunks are embedded with OpenAI. Large content may take a few seconds.</div></div>';
      html += '<div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"><table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">';
      html += '<th class="p-3">Title</th><th class="p-3">Category</th><th class="p-3">Source</th><th class="p-3"></th></tr></thead><tbody>';
      rows.forEach(function(r) {
        var canEdit = (r.metadata && r.metadata.manual) || (r.source_url && String(r.source_url).indexOf('manual://') === 0);
        html += '<tr class="border-b border-gray-100 dark:border-gray-800"><td class="p-3 max-w-xs truncate">' + Utils.escapeHtml(r.title || '') + '</td>';
        html += '<td class="p-3">' + Utils.escapeHtml(r.category || '') + '</td>';
        html += '<td class="p-3 max-w-xs truncate text-xs">' + Utils.escapeHtml(r.source_url || '') + '</td>';
        html += '<td class="p-3 space-x-2 whitespace-nowrap">';
        if (canEdit) html += '<button type="button" class="text-xs text-mak-green admin-doc-edit" data-id="' + r.id + '">Edit</button>';
        html += '<button type="button" class="text-xs text-mak-red admin-doc-del" data-id="' + r.id + '">Delete</button></td></tr>';
      });
      html += '</tbody></table></div>';
      main.innerHTML = html;
      document.getElementById('doc-save').addEventListener('click', function() {
        var title = document.getElementById('doc-title').value.trim();
        var content = document.getElementById('doc-body').value.trim();
        var category = document.getElementById('doc-cat').value.trim() || 'faq';
        if (!title || !content) { Utils.showToast('Title and content required', 'error'); return; }
        adminFetch('/documents', { method: 'POST', body: { title: title, content: content, category: category } }).then(function() {
          Utils.showToast('Saved', 'success');
          loadDocuments();
        }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
      });
      main.querySelectorAll('.admin-doc-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          adminFetch('/documents/' + id).then(function(d) {
            var doc = d.document;
            var mh = '<div class="space-y-2 text-sm"><label class="block text-xs text-gray-500">Title</label>';
            mh += '<input id="edit-doc-title" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + Utils.escapeHtml(doc.title || '') + '">';
            mh += '<label class="block text-xs text-gray-500 mt-2">Category</label>';
            mh += '<input id="edit-doc-cat" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + Utils.escapeHtml(doc.category || '') + '">';
            mh += '<label class="block text-xs text-gray-500 mt-2">Content</label>';
            mh += '<textarea id="edit-doc-body" rows="10" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">' + Utils.escapeHtml(doc.content || '') + '</textarea>';
            mh += '<button type="button" id="edit-doc-save" class="mt-2 w-full py-2 rounded-lg bg-mak-green text-white text-sm font-medium">Save & re-embed</button></div>';
            openModal('Edit document', mh);
            document.getElementById('edit-doc-save').addEventListener('click', function() {
              var body = {
                title: document.getElementById('edit-doc-title').value.trim(),
                content: document.getElementById('edit-doc-body').value.trim(),
                category: document.getElementById('edit-doc-cat').value.trim() || 'faq'
              };
              if (!body.title || !body.content) { Utils.showToast('Title and content required', 'error'); return; }
              adminFetch('/documents/' + id, { method: 'PUT', body: body }).then(function() {
                Utils.showToast('Updated', 'success');
                closeModal();
                loadDocuments();
              }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
            });
          }).catch(function(e) { Utils.showToast(e.message || 'Failed to load', 'error'); });
        });
      });
      main.querySelectorAll('.admin-doc-del').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (!confirm('Delete this chunk?')) return;
          adminFetch('/documents/' + btn.getAttribute('data-id'), { method: 'DELETE' }).then(function() { loadDocuments(); });
        });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadReference() {
    var main = document.getElementById('admin-main');
    adminFetch('/reference-images').then(function(d) {
      var imgs = d.images || [];
      var html = '<form id="ref-form" class="mb-6 flex flex-wrap gap-2 items-end rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">';
      html += '<div><label class="text-xs text-gray-500">Image</label><input type="file" name="image" accept="image/*" required class="block text-sm"></div>';
      html += '<div><label class="text-xs text-gray-500">Category</label><input name="category" value="maps" class="border rounded px-2 py-1 text-sm w-28 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"></div>';
      html += '<div><label class="text-xs text-gray-500">Name</label><input name="name" placeholder="campus_map" class="border rounded px-2 py-1 text-sm w-36 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"></div>';
      html += '<button type="submit" class="px-4 py-2 rounded-lg bg-mak-green text-white text-sm">Upload</button></form>';
      html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';
      imgs.forEach(function(im) {
        html += '<div class="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">';
        if (im.url) html += '<img src="' + Utils.escapeHtml(im.url) + '" class="w-full h-28 object-cover cursor-pointer" onclick="Utils.openLightbox(this.src)">';
        html += '<div class="p-2 text-xs flex flex-col gap-1"><span class="truncate text-gray-600 dark:text-gray-400" title="' + Utils.escapeHtml(im.key) + '">' + Utils.escapeHtml(im.display_name || im.key) + '</span>';
        html += '<div class="flex justify-end gap-2"><button type="button" class="text-mak-green shrink-0 admin-ref-edit" data-key="' + Utils.escapeHtml(im.key) + '">Edit meta</button>';
        html += '<button type="button" class="text-mak-red shrink-0 admin-ref-del" data-key="' + Utils.escapeHtml(im.key) + '">×</button></div></div></div>';
      });
      html += '</div>';
      if (!imgs.length) html += '<p class="text-gray-500 text-sm">No reference images yet</p>';
      main.innerHTML = html;
      var form = document.getElementById('ref-form');
      if (form) form.addEventListener('submit', function(ev) {
        ev.preventDefault();
        var fd = new FormData(form);
        fetch('/api/admin/reference-images', { method: 'POST', body: fd, credentials: 'include' }).then(function(res) {
          if (!res.ok) return res.json().then(function(j) { throw new Error(j.error); });
          return res.json();
        }).then(function() { Utils.showToast('Uploaded', 'success'); loadReference(); })
          .catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
      });
      main.querySelectorAll('.admin-ref-edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var key = btn.getAttribute('data-key');
          var im = imgs.filter(function(x) { return x.key === key; })[0] || {};
          var tagsStr = Array.isArray(im.tags) ? im.tags.join(', ') : (im.tags ? String(im.tags) : '');
          var mh = '<div class="space-y-2 text-sm"><p class="text-xs text-gray-500 break-all">' + Utils.escapeHtml(key) + '</p>';
          mh += '<label class="block text-xs text-gray-500">Display name</label><input id="ref-meta-name" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + Utils.escapeHtml(im.display_name || '') + '">';
          mh += '<label class="block text-xs text-gray-500 mt-2">Category</label><input id="ref-meta-cat" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + Utils.escapeHtml(im.category || '') + '">';
          mh += '<label class="block text-xs text-gray-500 mt-2">Description</label><textarea id="ref-meta-desc" rows="3" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">' + Utils.escapeHtml(im.description || '') + '</textarea>';
          mh += '<label class="block text-xs text-gray-500 mt-2">Tags (comma-separated)</label><input id="ref-meta-tags" class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + Utils.escapeHtml(tagsStr) + '">';
          mh += '<button type="button" id="ref-meta-save" class="mt-2 w-full py-2 rounded-lg bg-mak-green text-white text-sm font-medium">Save metadata</button></div>';
          openModal('Reference image', mh);
          document.getElementById('ref-meta-save').addEventListener('click', function() {
            var rawTags = document.getElementById('ref-meta-tags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
            adminFetch('/reference-images/' + encodeURIComponent(key), {
              method: 'PUT',
              body: {
                display_name: document.getElementById('ref-meta-name').value.trim() || null,
                category: document.getElementById('ref-meta-cat').value.trim() || null,
                description: document.getElementById('ref-meta-desc').value.trim() || null,
                tags: rawTags
              }
            }).then(function() {
              Utils.showToast('Saved', 'success');
              closeModal();
              loadReference();
            }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
          });
        });
      });
      main.querySelectorAll('.admin-ref-del').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var key = btn.getAttribute('data-key');
          if (!confirm('Delete?')) return;
          adminFetch('/reference-images/' + encodeURIComponent(key), { method: 'DELETE' }).then(function() { loadReference(); });
        });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadIngest() {
    var main = document.getElementById('admin-main');
    adminFetch('/ingest/status').then(function(d) {
      var html = '<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Trigger a full scrape and embedding run. This can take several minutes and uses your OpenAI quota.</p>';
      html += '<button type="button" id="btn-ingest" class="px-4 py-2 rounded-lg bg-mak-dark text-white text-sm font-medium mb-6">Start ingestion</button>';
      html += '<h3 class="text-sm font-semibold mb-2">Recent runs</h3><ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">';
      (d.runs || []).forEach(function(r) {
        html += '<li>' + Utils.escapeHtml(r.source || '') + ' — ' + r.status + ' @ ' + Utils.formatTime(r.started_at) + '</li>';
      });
      html += '</ul><p class="mt-4 text-xs text-gray-500">Document chunks in DB: ' + (d.document_chunks || 0) + '</p>';
      main.innerHTML = html;
      document.getElementById('btn-ingest').addEventListener('click', function() {
        adminFetch('/ingest', { method: 'POST', body: { source: 'all' } }).then(function() {
          Utils.showToast('Ingestion started in background', 'success');
        }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadSettings() {
    var main = document.getElementById('admin-main');
    adminFetch('/settings').then(function(d) {
      var s = d.settings || {};
      function pickStr(v) { return v == null ? '' : String(v); }
      function pickNum(v, def) {
        if (v == null || v === '') return def;
        if (typeof v === 'number' && !isNaN(v)) return v;
        var n = parseInt(String(v), 10);
        return isNaN(n) ? def : n;
      }
      var sp = pickStr(s.system_prompt);
      var html = '<div class="max-w-xl space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">';
      html += '<div><label class="text-xs text-gray-500">System prompt</label>';
      html += '<textarea id="set-prompt" rows="4" class="w-full border rounded-lg p-2 text-sm mt-1 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">' + Utils.escapeHtml(sp) + '</textarea></div>';
      html += '<div class="grid grid-cols-2 gap-3"><div><label class="text-xs text-gray-500">Guest rate / hr</label>';
      html += '<input id="set-guest" type="number" class="w-full border rounded p-2 text-sm mt-1 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + pickNum(s.guest_rate_limit, 20) + '"></div>';
      html += '<div><label class="text-xs text-gray-500">Auth rate / hr</label>';
      html += '<input id="set-auth" type="number" class="w-full border rounded p-2 text-sm mt-1 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" value="' + pickNum(s.auth_rate_limit, 100) + '"></div></div>';
      html += '<p class="text-xs text-gray-500">Models (read-only): ' + Utils.escapeHtml(d.openai_model || '') + ' / ' + Utils.escapeHtml(d.embedding_model || '') + '</p>';
      html += '<button type="button" id="set-save" class="px-4 py-2 rounded-lg bg-mak-green text-white text-sm">Save settings</button></div>';
      main.innerHTML = html;
      document.getElementById('set-save').addEventListener('click', function() {
        var payload = {
          system_prompt: document.getElementById('set-prompt').value,
          guest_rate_limit: parseInt(document.getElementById('set-guest').value, 10),
          auth_rate_limit: parseInt(document.getElementById('set-auth').value, 10)
        };
        adminFetch('/settings', { method: 'PUT', body: payload }).then(function() {
          Utils.showToast('Saved', 'success');
        }).catch(function(e) { Utils.showToast(e.message || 'Failed', 'error'); });
      });
    }).catch(function() { main.innerHTML = '<p class="text-mak-red">Failed</p>'; });
  }

  function loadSection(name) {
    setActiveNav(name);
    destroyCharts();
    if (name === 'overview') loadOverview();
    else if (name === 'escalations') loadEscalations(null);
    else if (name === 'unresolved') loadUnresolved();
    else if (name === 'users') loadUsers();
    else if (name === 'conversations') loadConversations();
    else if (name === 'feedback') loadFeedback();
    else if (name === 'documents') loadDocuments();
    else if (name === 'reference') loadReference();
    else if (name === 'ingest') loadIngest();
    else if (name === 'settings') loadSettings();
  }

  function poll() {
    adminFetch('/stats').then(function(s) { escBadge(s.pending_escalations || 0); }).catch(function() {});
  }

  function init() {
    fetch('/api/auth/me', { credentials: 'include' }).then(function(r) {
      if (!r.ok) { window.location.href = '/login.html'; return; }
      return r.json();
    }).then(function(data) {
      if (!data || !data.user || data.user.role !== 'admin') {
        window.location.href = '/chat.html';
        return;
      }
      document.getElementById('admin-user-label').textContent = data.user.full_name || data.user.email;
      document.querySelectorAll('.admin-nav').forEach(function(btn) {
        btn.addEventListener('click', function() { loadSection(btn.getAttribute('data-section')); });
      });
      document.getElementById('admin-logout').addEventListener('click', function() {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(function() {
          window.location.href = '/';
        });
      });
      document.getElementById('modal-close').addEventListener('click', closeModal);
      document.getElementById('admin-modal').addEventListener('click', function(e) { if (e.target.id === 'admin-modal') closeModal(); });
      document.getElementById('sidebar-open').addEventListener('click', function() {
        document.getElementById('admin-sidebar').classList.remove('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.remove('hidden');
      });
      document.getElementById('sidebar-close').addEventListener('click', function() {
        document.getElementById('admin-sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
      });
      document.getElementById('sidebar-overlay').addEventListener('click', function() {
        document.getElementById('admin-sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
      });
      var tt = document.getElementById('theme-toggle-admin');
      if (tt) tt.addEventListener('click', function() { Theme.toggle(); });
      ['mousemove', 'keydown', 'click'].forEach(function(ev) {
        document.addEventListener(ev, touch, true);
      });
      setInterval(function() {
        if (Date.now() - lastActivity > INACTIVITY_MS) {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(function() {
            window.location.href = '/login.html';
          });
        }
      }, 60000);
      pollTimer = setInterval(poll, 60000);
      loadSection('overview');
    }).catch(function() { window.location.href = '/login.html'; });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
