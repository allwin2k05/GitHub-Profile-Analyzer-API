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

// Compare DOM Elements
const openCompareBtn = document.getElementById('open-compare-btn');
const compareModal = document.getElementById('compare-modal');
const compareCloseBtn = document.getElementById('compare-close-btn');
const compareSelectA = document.getElementById('compare-select-a');
const compareSelectB = document.getElementById('compare-select-b');
const compareMatchupContainer = document.getElementById('compare-matchup-container');

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

  // Compare Modal Events
  openCompareBtn.addEventListener('click', async () => {
    await populateCompareDropdowns();
    compareModal.classList.add('active');
  });

  compareCloseBtn.addEventListener('click', () => {
    compareModal.classList.remove('active');
  });

  compareModal.addEventListener('click', (e) => {
    if (e.target === compareModal) {
      compareModal.classList.remove('active');
    }
  });

  const triggerMatchup = () => {
    const userALogin = compareSelectA.value;
    const userBLogin = compareSelectB.value;
    if (userALogin && userBLogin) {
      renderMatchup(userALogin, userBLogin);
    }
  };

  compareSelectA.addEventListener('change', triggerMatchup);
  compareSelectB.addEventListener('change', triggerMatchup);
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
        
        <!-- Developer Persona Badge -->
        ${dev.persona_title ? `
          <div class="persona-badge" style="
            margin: 12px 0 16px;
            padding: 8px 14px;
            background: rgba(255, 0, 127, 0.08);
            border: 1px solid var(--accent-magenta);
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 0 10px rgba(255, 0, 127, 0.12);
          ">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-magenta); font-weight: 700;">Developer Persona</div>
            <div style="font-size: 13px; font-weight: 700; color: #fff; margin-top: 2px;">${dev.persona_title}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; line-height: 1.3;">${dev.persona_description}</div>
          </div>
        ` : ''}

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

        <!-- Competency Radar Chart -->
        <div class="section-box">
          <h3>Developer Competency Index</h3>
          <div style="height: 190px; position: relative; display: flex; justify-content: center; align-items: center; margin: 5px 0;">
            <canvas id="competency-chart" style="max-height: 190px; max-width: 100%;"></canvas>
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

  // Initialize radar competency chart
  setTimeout(() => {
    const ctx = document.getElementById('competency-chart')?.getContext('2d');
    if (!ctx) return;

    // Calculate dynamic scores between 1 and 10 based on developer's metrics
    const reposScore = Math.min(10, Math.max(1, Math.ceil(dev.public_repos / 3)));
    const starsScore = Math.min(10, Math.max(1, Math.ceil(Math.log10((dev.total_stars || 0) + 1) * 2)));
    const followersScore = Math.min(10, Math.max(1, Math.ceil(Math.log10((dev.followers || 0) + 1) * 2)));
    const languageScore = Math.min(10, Math.max(1, langEntries.length * 2));
    const maintenanceScore = Math.min(10, Math.max(1, Math.ceil(parseFloat(dev.avg_stars_per_repo) / 2)));

    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Coding Volume', 'Star Impact', 'Social Reach', 'Stack Breadth', 'Code Quality'],
        datasets: [{
          label: 'Skill Score',
          data: [reposScore, starsScore, followersScore, languageScore, maintenanceScore],
          backgroundColor: 'rgba(0, 242, 254, 0.15)',
          borderColor: '#00f2fe',
          pointBackgroundColor: '#ff007f',
          pointBorderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          r: {
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: { color: '#9ca3af', font: { family: 'Outfit', size: 10, weight: '500' } },
            ticks: { display: false, stepSize: 2 },
            min: 0,
            max: 10
          }
        }
      }
    });
  }, 50);
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

async function populateCompareDropdowns() {
  try {
    // Fetch all stored users (limit: 100)
    const res = await fetch('/api/users?limit=100');
    const result = await res.json();
    if (res.ok && result.success) {
      const users = result.data;
      const optionsHTML = '<option value="">-- Choose Developer --</option>' + 
        users.map(u => `<option value="${u.login}">${u.name || u.login} (@${u.login})</option>`).join('');
      
      compareSelectA.innerHTML = optionsHTML;
      compareSelectB.innerHTML = optionsHTML;
      
      // Auto select first two if available
      if (users.length >= 2) {
        compareSelectA.value = users[0].login;
        compareSelectB.value = users[1].login;
        renderMatchup(users[0].login, users[1].login);
      } else {
        compareMatchupContainer.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Failed to populate compare options', err);
  }
}

async function renderMatchup(loginA, loginB) {
  if (loginA === loginB) {
    compareMatchupContainer.innerHTML = '<div class="empty-state">Please select two different developers to compare.</div>';
    compareMatchupContainer.style.display = 'block';
    return;
  }

  try {
    const [resA, resB] = await Promise.all([
      fetch(`/api/users/local/${loginA}`).then(r => r.json()),
      fetch(`/api/users/local/${loginB}`).then(r => r.json())
    ]);

    if (!resA.success || !resB.success) {
      compareMatchupContainer.innerHTML = '<div class="empty-state">Error loading matchup details.</div>';
      compareMatchupContainer.style.display = 'block';
      return;
    }

    const devA = resA.data;
    const devB = resB.data;

    // Helper to evaluate winner
    const compareVal = (valA, valB, higherIsBetter = true) => {
      const numA = parseFloat(valA) || 0;
      const numB = parseFloat(valB) || 0;
      if (numA === numB) return { classA: '', classB: '' };
      const isAWinner = higherIsBetter ? numA > numB : numA < numB;
      return {
        classA: isAWinner ? 'style="color: var(--accent-green); font-weight: 700;"' : 'style="color: var(--text-secondary);"',
        classB: !isAWinner ? 'style="color: var(--accent-green); font-weight: 700;"' : 'style="color: var(--text-secondary);"'
      };
    };

    const starsCmp = compareVal(devA.total_stars, devB.total_stars);
    const reposCmp = compareVal(devA.public_repos, devB.public_repos);
    const followersCmp = compareVal(devA.followers, devB.followers);
    const avgStarsCmp = compareVal(devA.avg_stars_per_repo, devB.avg_stars_per_repo);
    const ageCmp = compareVal(devA.account_age_years, devB.account_age_years);

    compareMatchupContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 120px 1fr; gap: 15px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 20px;">
        <!-- Developer A Header -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
          <img src="${devA.avatar_url || 'https://github.com/identicons/' + devA.login + '.png'}" class="profile-avatar-lg" style="width: 80px; height: 80px; border-color: var(--accent-cyan);" onerror="this.src='https://github.com/identicons/octocat.png'">
          <h3 style="font-size: 16px; font-weight: 700; margin-top: 8px;">${devA.name || devA.login}</h3>
          <span style="font-size: 12px; color: var(--accent-cyan);">@${devA.login}</span>
          <span style="font-size: 11px; background: rgba(139, 92, 246, 0.15); color: var(--accent-blue); padding: 2px 8px; border-radius: 4px; margin-top: 6px; font-weight: 600;">${devA.persona_title || 'Rising Tech'}</span>
        </div>

        <!-- VS Divider -->
        <div style="font-size: 20px; font-weight: 800; text-align: center; color: var(--accent-magenta);">VS</div>

        <!-- Developer B Header -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
          <img src="${devB.avatar_url || 'https://github.com/identicons/' + devB.login + '.png'}" class="profile-avatar-lg" style="width: 80px; height: 80px; border-color: var(--accent-magenta);" onerror="this.src='https://github.com/identicons/octocat.png'">
          <h3 style="font-size: 16px; font-weight: 700; margin-top: 8px;">${devB.name || devB.login}</h3>
          <span style="font-size: 12px; color: var(--accent-magenta);">@${devB.login}</span>
          <span style="font-size: 11px; background: rgba(255, 0, 127, 0.15); color: var(--accent-magenta); padding: 2px 8px; border-radius: 4px; margin-top: 6px; font-weight: 600;">${devB.persona_title || 'Rising Tech'}</span>
        </div>
      </div>

      <!-- Matchup Table Grid -->
      <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 150px 1fr; text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
          <span ${reposCmp.classA}>${devA.public_repos}</span>
          <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">Repositories</strong>
          <span ${reposCmp.classB}>${devB.public_repos}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 150px 1fr; text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
          <span ${starsCmp.classA}>${devA.total_stars}</span>
          <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">Total Stars</strong>
          <span ${starsCmp.classB}>${devB.total_stars}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 150px 1fr; text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
          <span ${followersCmp.classA}>${devA.followers}</span>
          <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">Followers</strong>
          <span ${followersCmp.classB}>${devB.followers}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 150px 1fr; text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
          <span ${avgStarsCmp.classA}>${parseFloat(devA.avg_stars_per_repo).toFixed(1)}</span>
          <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">Avg Stars / Repo</strong>
          <span ${avgStarsCmp.classB}>${parseFloat(devB.avg_stars_per_repo).toFixed(1)}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 150px 1fr; text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
          <span ${ageCmp.classA}>${parseFloat(devA.account_age_years).toFixed(1)} years</span>
          <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">Account Age</strong>
          <span ${ageCmp.classB}>${parseFloat(devB.account_age_years).toFixed(1)} years</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 150px 1fr; text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
          <span style="font-weight: 600;">${devA.top_language || 'N/A'}</span>
          <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">Primary Language</strong>
          <span style="font-weight: 600;">${devB.top_language || 'N/A'}</span>
        </div>
      </div>
    `;
    compareMatchupContainer.style.display = 'block';
  } catch (err) {
    compareMatchupContainer.innerHTML = '<div class="empty-state">Failed to calculate developer matchup.</div>';
    compareMatchupContainer.style.display = 'block';
  }
}
