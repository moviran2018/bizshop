;(function() {
  'use strict';

  // ===== Sidebar Toggle =====
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');
  const sidebarClose = document.getElementById('sidebarClose');

  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // ===== Bottom Nav Active State =====
  const currentPage = window.location.hash.replace('#', '') || 'dashboard';
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const page = item.dataset.page;
    if (page === currentPage) item.classList.add('active');
  });

  // ===== Card View Renderer =====
  window.renderCardView = function(tableId, containerId) {
    const table = document.getElementById(tableId);
    const container = document.getElementById(containerId);
    if (!table || !container) return;

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = table.querySelectorAll('tbody tr');

    container.innerHTML = Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      return `
        <div class="card-view-item" onclick="window.location.href='${row.dataset.link || '#'}'">
          ${Array.from(cells).map((cell, i) => `
            <div class="card-view-row">
              <span class="label">${headers[i] || ''}</span>
              <span class="value ${cell.dataset.class || ''}">${cell.innerHTML}</span>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  };

  // ===== Animate Counter =====
  window.animateCounter = function(el, target, suffix) {
    suffix = suffix || '';
    let current = 0;
    const step = Math.ceil(target / 30);
    const timer = setInterval(function() {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current.toLocaleString('fa-IR') + suffix;
    }, 40);
  };

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.stat-value[data-count]').forEach(function(el) {
      var target = parseInt(el.dataset.count);
      var suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix);
    });
  });

})();
