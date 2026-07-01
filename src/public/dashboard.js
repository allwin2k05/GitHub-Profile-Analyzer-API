// State management
let currentPage = 1;
const limit = 10;
let currentFilters = {
  language: '',
  location: '',
  hireable: '',
  sortBy: 'synced_at',
  order: 'DESC'
};

// DOM Elements
const syncForm = document.getElementById('sync-form');
const syncUsernameInput = document.getElementById('sync-username');
const syncBtn = document.getElementById('sync-btn');
const syncMessage = document.getElementById('sync-message');

const healthDot = document.getElementById('health-dot');
const healthText = document.getElementById('health-text');
const healthDetails = document.getElementById('health-details');

const statTotalUsers = document.getElementById('stat-total-users');
const statAvgRepos = document.getElementById('stat-avg-repos');
const statImpact = document.getElementById('stat-impact');
const statTopInfluencer = document.getElementById('stat-top-influencer');

const filterLanguage = document.getElementById('filter-language');
const filterLocation = document.getElementById('filter-location');
const filterHireable = document.getElementById('filter-hireable');
const sortBySelect = document.getElementById('sort-by');
const sortOrderSelect = document.getElementById('sort-order');
const resetFiltersBtn = document.getElementById('reset-filters');

const devListTbody = document.getElementById('dev-list-tbody');
const resultsCount = document.getElementById('results-count');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageIndicator = document.getElementById('page-indicator');

const detailModal = document.getElementById('detail-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalBody = document.getElementById('modal-body');

// On load
document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  fetchAnalytics();
  fetchDevelopers();
  setupEventListeners();
});

function setupEventListeners() {
  // Sync Profile Form
  syncForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = syncUsernameInput.value.trim();
    if (!username) return;

    showSyncState(true);
    try {
      const response = await fetch(`/api/users/sync/${username}`, {
        method: 'POST'
      });
      const result = await response.json();

      if (response.ok && result.success) {
        if (result.status === 'UPDATED') {
          showSyncMessage('success', `Successfully synced ${username}!`);
        } else {
          showSyncMessage('info', `Profile ${username} is already up to date.`);
        }
        // Refresh dashboard data
        fetchAnalytics();
        fetchDevelopers();
      } else {
        showSyncMessage('error', result.message || `Failed to sync user.`);
      }
    } catch (err) {
      showSyncMessage('error', 'Network error. Please try again.');
    } finally {
      showSyncState(false);
    }
  });

  // Filter and Sorting Events
  const triggerFilterUpdate = () => {
    currentFilters.language = filterLanguage.value.trim();
    currentFilters.location = filterLocation.value.trim();
    currentFilters.hireable = filterHireable.value;
    currentFilters.sortBy = sortBySelect.value;
    currentFilters.order = sortOrderSelect.value;
    currentPage = 1;
    fetchDevelopers();
  };

  // Debounced input helper
  let filterTimeout;
  const debouncedFilter = () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(triggerFilterUpdate, 400);
  };

  filterLanguage.addEventListener('input', debouncedFilter);
  filterLocation.addEventListener('input', debouncedFilter);
  filterHireable.addEventListener('change', triggerFilterUpdate);
  sortBySelect.addEventListener('change', triggerFilterUpdate);
  sortOrderSelect.addEventListener('change', triggerFilterUpdate);

  resetFiltersBtn.addEventListener('click', () => {
    filterLanguage.value = '';
    filterLocation.value = '';
    filterHireable.value = '';
    sortBySelect.value = 'synced_at';
    sortOrderSelect.value = 'DESC';
    triggerFilterUpdate();
  });

  // Pagination Events
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchDevelopers();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    fetchDevelopers();
  });

  // Modal Events
  modalCloseBtn.addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      detailModal.classList.remove('active');
    }
  });
}

// Check Health
async function checkHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();
    if (res.ok && data.success) {
      healthDot.className = 'status-dot online';
      healthText.innerText = 'Service: Connected';
      healthDetails.innerText = `Uptime: ${(data.uptime / 60).toFixed(1)}m | Node: ${data.node_version}`;
    } else {
      setHealthOffline();
    }
  } catch (err) {
    setHealthOffline();
  }
}

function setHealthOffline() {
  healthDot.className = 'status-dot offline';
  healthText.innerText = 'Service: Offline';
  healthDetails.innerText = 'Unable to reach backend database';
}

// Fetch Analytics Summary
async function fetchAnalytics() {
  try {
    const res = await fetch('/api/users/analytics');
    const result = await res.json();
    if (res.ok && result.success) {
      const data = result.data;
      statTotalUsers.innerText = data.total_users || 0;
      statAvgRepos.innerText = data.avg_repositories ? parseFloat(data.avg_repositories).toFixed(1) : 0;
      statImpact.innerText = formatNumber(data.ecosystem_impact || 0);
      statTopInfluencer.innerText = data.top_influencer ? `@${data.top_influencer}` : 'N/A';
    }
  } catch (err) {
    console.error('Failed to fetch analytics', err);
  }
}

// Fetch Developers list
async function fetchDevelopers() {
  try {
    let queryParams = new URLSearchParams({
      page: currentPage,
      limit: limit,
      sortBy: currentFilters.sortBy,
      order: currentFilters.order
    });

    if (currentFilters.language) queryParams.append('language', currentFilters.language);
    if (currentFilters.location) queryParams.append('location', currentFilters.location);
    if (currentFilters.hireable) queryParams.append('hireable', currentFilters.hireable);

    const res = await fetch(`/api/users?${queryParams.toString()}`);
    const result = await res.json();

    if (res.ok && result.success) {
      renderDevelopersTable(result.data);
      updatePaginationControls(result.pagination);
    } else {
      devListTbody.innerHTML = `<tr><td colspan="8" class="empty-state">Error: ${result.message}</td></tr>`;
    }
  } catch (err) {
    devListTbody.innerHTML = `<tr><td colspan="8" class="empty-state">Failed to retrieve profiles.</td></tr>`;
  }
}

function renderDevelopersTable(developers) {
  if (developers.length === 0) {
    devListTbody.innerHTML = `<tr><td colspan="8" class="empty-state">No matching developers found.</td></tr>`;
    return;
  }

  devListTbody.innerHTML = developers.map(dev => {
    const isHireableBadge = dev.hireable 
      ? '<span class="badge-hireable">Open to Work</span>' 
      : '<span class="badge-busy">Unavailable</span>';

    return `
      <tr>
        <td>
          <div class="td-developer">
            <img src="${dev.avatar_url || 'https://github.com/identicons/' + dev.login + '.png'}" alt="${dev.login}" class="avatar-round" onerror="this.src='https://github.com/identicons/octocat.png'">
            <div class="dev-info">
              <span class="name">${dev.name || dev.login}</span>
              <span class="login">@${dev.login}</span>
            </div>
          </div>
        </td>
        <td><span class="badge-lang">${dev.top_language || 'None'}</span></td>
        <td><strong>${formatNumber(dev.total_stars)}</strong></td>
        <td>${formatNumber(dev.followers)}</td>
        <td>${parseFloat(dev.avg_stars_per_repo).toFixed(1)}</td>
        <td><span class="text-sec">${dev.location || 'N/A'}</span></td>
        <td>${isHireableBadge}</td>
        <td>
          <div class="action-row">
            <button class="btn-sm" onclick="viewDetails('${dev.login}')">Insights</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updatePaginationControls(pagination) {
  const { total, page, limit, totalPages } = pagination;
  resultsCount.innerText = `Showing ${total} developers`;
  pageIndicator.innerText = `Page ${page} of ${totalPages || 1}`;
  
  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages;
}

// View Details Modal
window.viewDetails = async function(username) {
  try {
    const res = await fetch(`/api/users/local/${username}`);
    const result = await res.json();
    if (res.ok && result.success) {
      renderProfileDetails(result.data);
      detailModal.classList.add('active');
    } else {
      alert(`Error loading developer details: ${result.message}`);
    }
  } catch (err) {
    alert('Failed to connect to backend.');
  }
};

function renderProfileDetails(dev) {
  // Parse JSON distributions
  let langsDist = {};
  let topRepos = [];
  try {
    langsDist = typeof dev.languages_distribution === 'string' 
      ? JSON.parse(dev.languages_distribution) 
      : dev.languages_distribution || {};
  } catch (e) {}

  try {
    topRepos = typeof dev.top_repositories === 'string'
      ? JSON.parse(dev.top_repositories)
      : dev.top_repositories || [];
  } catch (e) {}

  // Generate languages distribution bars
  const langEntries = Object.entries(langsDist).sort((a, b) => b[1].percentage - a[1].percentage);
  const langBarsHTML = langEntries.length > 0
    ? langEntries.slice(0, 4).map(([lang, info]) => `
        <div class="lang-dist-item">
          <div class="lang-dist-info">
            <span>${lang}</span>
            <span>${info.count} repos (${info.percentage}%)</span>
          </div>
          <div class="lang-dist-bar-wrapper">
            <div class="lang-dist-bar" style="width: ${info.percentage}%"></div>
          </div>
        </div>
      `).join('')
    : '<div class="empty-state">No repository language data available</div>';

  // Generate top repositories HTML
  const reposHTML = topRepos.length > 0
    ? topRepos.map(repo => `
        <a href="${repo.url}" target="_blank" class="repo-item">
          <div class="repo-item-left">
            <span class="name">${repo.name}</span>
            <span class="lang">${repo.language || 'Plain Text'}</span>
          </div>
          <div class="repo-item-right">
            <div class="repo-stat">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>${repo.stars}</span>
            </div>
            <div class="repo-stat">
              <svg class="stat-icon fork-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="12" cy="12" r="3"/>
                <path d="M18 15V9a4 4 0 0 0-4-4H9M6 9v6a4 4 0 0 0 4 4h4"/>
              </svg>
              <span>${repo.forks}</span>
            </div>
          </div>
        </a>
      `).join('')
    : '<div class="empty-state">No repositories available</div>';

  modalBody.innerHTML = `
    <div class="profile-modal-grid">
      <!-- Left Column -->
      <div class="profile-card-left">
        <img src="${dev.avatar_url || 'https://github.com/identicons/' + dev.login + '.png'}" alt="${dev.login}" class="profile-avatar-lg" onerror="this.src='https://github.com/identicons/octocat.png'">
        <h2>${dev.name || dev.login}</h2>
        <div class="login">@${dev.login}</div>
        <p class="bio">${dev.bio || 'This developer has no bio set on their public GitHub profile.'}</p>
        
        <div class="meta-details-list">
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>${dev.location || 'Unknown Location'}</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>${dev.blog ? `<a href="${dev.blog.startsWith('http') ? dev.blog : 'https://' + dev.blog}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">${dev.blog}</a>` : 'No website link'}</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
            </svg>
            <span>${dev.company || 'Independent Developer'}</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
            </svg>
            <span>${dev.twitter_username ? `@${dev.twitter_username}` : 'No Twitter handle'}</span>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="profile-card-right">
        <!-- Stat box row -->
        <div class="metrics-row">
          <div class="metric-box">
            <div class="val">${dev.public_repos}</div>
            <div class="lbl">Repositories</div>
          </div>
          <div class="metric-box">
            <div class="val">${formatNumber(dev.total_stars)}</div>
            <div class="lbl">Total Stars</div>
          </div>
          <div class="metric-box">
            <div class="val">${formatNumber(dev.followers)}</div>
            <div class="lbl">Followers</div>
          </div>
          <div class="metric-box">
            <div class="val">${parseFloat(dev.account_age_years).toFixed(1)}y</div>
            <div class="lbl">Account Age</div>
          </div>
        </div>

        <div class="insights-section">
          <!-- Languages distribution -->
          <div class="section-box">
            <h3>Languages Distribution</h3>
            <div class="lang-dist-list">
              ${langBarsHTML}
            </div>
          </div>

          <!-- Top Repositories -->
          <div class="section-box">
            <h3>Top Repositories</h3>
            <div class="repo-list">
              ${reposHTML}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helpers
function showSyncState(isLoading) {
  if (isLoading) {
    syncBtn.disabled = true;
    syncUsernameInput.disabled = true;
    syncBtn.innerHTML = `
      <svg class="btn-icon animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
    `;
    showSyncMessage('info', 'Contacting GitHub API and performing developer analysis...');
  } else {
    syncBtn.disabled = false;
    syncUsernameInput.disabled = false;
    syncBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
    `;
  }
}

function showSyncMessage(type, text) {
  syncMessage.className = `message-banner ${type}`;
  syncMessage.innerText = text;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num;
}
