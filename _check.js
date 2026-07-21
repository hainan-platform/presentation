
// ===== 全局状态 =====
let allData = [];
let filteredData = [];
let currentPage = 1;
const PAGE_SIZE = 30;
let currentFilter = 'all';
let industryChartInstance = null;
let sourceChartInstance = null;
let levelChartInstance = null;
let opcIndustryChartInstance = null;
let radarChartInstance = null;
let opcData = null;
let currentOPCFilter = 'all';

// ===== 视图切换 =====
function switchView(view) {
  document.getElementById('projectsView').style.display = view === 'projects' ? 'block' : 'none';
  document.getElementById('opcView').style.display = view === 'opc' ? 'block' : 'none';
  document.getElementById('matchesView').style.display = view === 'matches' ? 'block' : 'none';

  document.getElementById('viewTabProjects').className = view === 'projects' ? 'view-tab-active px-5 py-2 rounded-lg text-sm font-medium transition' : 'view-tab-inactive px-5 py-2 rounded-lg text-sm font-medium transition';
  document.getElementById('viewTabOPC').className = view === 'opc' ? 'view-tab-active px-5 py-2 rounded-lg text-sm font-medium transition' : 'view-tab-inactive px-5 py-2 rounded-lg text-sm font-medium transition';
  document.getElementById('viewTabMatches').className = view === 'matches' ? 'view-tab-active px-5 py-2 rounded-lg text-sm font-medium transition' : 'view-tab-inactive px-5 py-2 rounded-lg text-sm font-medium transition';

  if (view === 'opc' && opcData) renderOPCView();
  if (view === 'matches' && opcData) renderMatchesTable();
}

// ===== 数据加载 =====
async function loadData() {
  try {
    const resp = await fetch('./data.json?t=' + Date.now());
    const json = await resp.json();
    allData = json.data || [];
    updateStats(json.stats || {});
    updateStatus('数据已加载');
    renderAll();
  } catch (e) {
    console.error('项目数据加载失败:', e);
    document.getElementById('projectTableBody').innerHTML = 
      '<tr><td colspan="7" class="text-center py-8 text-red-400">数据加载失败，请确认 data.json 文件存在</td></tr>';
  }

  // 加载OPC数据
  try {
    const resp2 = await fetch('./opc_data.json?t=' + Date.now());
    opcData = await resp2.json();
    updateOPCStats();
  } catch (e) {
    console.error('OPC数据加载失败:', e);
  }
}

// ===== UI 更新 =====
function updateStats(stats) {
  document.getElementById('statTotal').textContent = stats.total || 0;
  document.getElementById('statIT').textContent = stats.it_count || 0;
  document.getElementById('statMerged').textContent = stats.opc_count || 0;
  document.getElementById('statSources').textContent = Object.keys(stats.source_stats || {}).length;
  const today = new Date().toISOString().slice(0,10);
  const todayCount = allData.filter(d => d.date && d.date.startsWith(today)).length;
  document.getElementById('statToday').textContent = todayCount;
  document.getElementById('updateTime').innerHTML = 
    '<i class="fas fa-clock mr-1"></i>更新: ' + (stats.update_time || '--');
}

function updateOPCStats() {
  if (!opcData) return;
  const s = opcData.stats;
  document.getElementById('opcStatTotal').textContent = s.total_enterprises || 0;
  document.getElementById('opcStatB').textContent = (s.level_stats || {}).B || 0;
  document.getElementById('opcStatC').textContent = (s.level_stats || {}).C || 0;
  document.getElementById('opcStatD').textContent = (s.level_stats || {}).D || 0;
  document.getElementById('opcStatMatches').textContent = s.total_matches || 0;
}

function updateStatus(status) {
  const dot = document.getElementById('statusDot');
  if (status.includes('已加载') || status === '数据就绪') {
    dot.className = 'w-2 h-2 rounded-full bg-green-400 inline-block';
  } else if (status === '正在采集...') {
    dot.className = 'pulse-dot w-2 h-2 rounded-full bg-yellow-400 inline-block';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-red-400 inline-block';
  }
}

// ===== 渲染 =====
function renderAll() {
  filterProjects();
  renderIndustryChart();
  renderSourceChart();
  renderITSection();
  renderMergedSection();
}

// --- 项目列表 ---
function filterProjects() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  let data = allData;
  if (currentFilter === 'it') {
    data = data.filter(d => d.is_it_project);
  } else if (currentFilter === 'hainan') {
    data = data.filter(d => d.province === '海南省' || d.source_name === '省公共资源交易中心' || d.source_name === '省财政厅' || d.source_name === '省政府网站' || d.source_name === '省发改委' || d.source_name === '省工信厅');
  } else if (currentFilter === 'zhejiang') {
    data = data.filter(d => d.province === '浙江省' || d.source_name === '浙江省公共资源交易服务平台');
  } else if (currentFilter === 'ggzy') {
    data = data.filter(d => d.source_name === '省公共资源交易中心' || d.source_name === '浙江省公共资源交易服务平台');
  } else if (currentFilter === 'fagw') {
    data = data.filter(d => d.source_name === '省发改委');
  }
  if (search) {
    data = data.filter(d => {
      const text = (d.title + ' ' + d.industry + ' ' + d.source_name + ' ' + (d.it_tags||[]).join(' ')).toLowerCase();
      return text.includes(search);
    });
  }
  filteredData = data;
  document.getElementById('filterCount').textContent = '共 ' + data.length + ' 条';
  currentPage = 1;
  renderProjectTable();
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('[id^="tab"]').forEach(el => {
    if (el.id.startsWith('tab') && !el.id.startsWith('tabH') && !el.id.startsWith('tabZ')) {
      el.className = 'tab-inactive px-3 py-1 rounded text-sm font-medium';
    }
  });
  const tabId = {'all':'tabAll','it':'tabIT','hainan':'tabHainan','zhejiang':'tabZhejiang','ggzy':'tabGGZY','fagw':'tabFAGW'}[f];
  if (tabId) document.getElementById(tabId).className = 'tab-active px-3 py-1 rounded text-sm font-medium';
  filterProjects();
}

function renderProjectTable() {
  const tbody = document.getElementById('projectTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredData.slice(start, start + PAGE_SIZE);
  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500">暂无数据</td></tr>';
    document.getElementById('paginationBar').style.display = 'none';
    return;
  }
  tbody.innerHTML = pageData.map((d, i) => {
    const idx = start + i + 1;
    const isIT = d.is_it_project;
    const isMerged = d.is_merged;
    const sourceNames = isMerged ? d.merge_sources.join(' · ') : d.source_name;
    const badges = [
      ...(d.it_tags || []).map(t => '<span class="it-badge">' + t + '</span>'),
      isMerged ? '<span class="merged-badge">跨' + d.merge_count + '源</span>' : '',
    ].filter(Boolean).join('');
    return '<tr class="project-row ' + (isIT ? 'it-row' : '') + ' border-b border-slate-700/30">' +
      '<td class="py-2 px-2 text-slate-500">' + idx + '</td>' +
      '<td class="py-2 px-2"><a href="' + d.source_url + '" target="_blank" class="hover:text-blue-400 hover:underline ' + (isIT ? 'text-purple-300 font-medium' : '') + '">' + (d.title.length > 55 ? d.title.slice(0,55)+'...' : d.title) + '</a></td>' +
      '<td class="py-2 px-2 ' + (isIT ? 'text-purple-400' : 'text-slate-400') + '">' + (d.industry || '--') + '</td>' +
      '<td class="py-2 px-2 text-slate-400">' + (d.project_nature || '--') + '</td>' +
      '<td class="py-2 px-2 text-xs text-slate-400">' + sourceNames + '</td>' +
      '<td class="py-2 px-2 text-slate-500 text-xs">' + (d.date || '--') + '</td>' +
      '<td class="py-2 px-2">' + badges + '</td></tr>';
  }).join('');
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  if (totalPages > 1) {
    document.getElementById('paginationBar').style.display = 'flex';
    document.getElementById('pageInfo').textContent = '第 ' + currentPage + '/' + totalPages + ' 页';
  } else {
    document.getElementById('paginationBar').style.display = 'none';
  }
}

function prevPage() { if (currentPage > 1) { currentPage--; renderProjectTable(); } }
function nextPage() { const t = Math.ceil(filteredData.length / PAGE_SIZE); if (currentPage < t) { currentPage++; renderProjectTable(); } }

// --- IT项目专区 ---
function renderITSection() {
  const itData = allData.filter(d => d.is_it_project);
  const container = document.getElementById('itProjectList');
  if (itData.length === 0) { container.innerHTML = '<div class="text-slate-500 text-center py-4">暂无IT项目数据</div>'; return; }
  container.innerHTML = itData.slice(0, 20).map(d => {
    const tags = (d.it_tags||[]).map(t => '<span class="it-badge">' + t + '</span>').join('');
    const merged = d.is_merged ? '<span class="merged-badge">跨' + d.merge_count + '源</span>' : '';
    return '<div class="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-900/20 transition"><i class="fas fa-microchip text-purple-400 mt-1 text-xs"></i><div class="flex-1"><a href="' + d.source_url + '" target="_blank" class="text-sm text-purple-200 hover:text-purple-100 hover:underline">' + d.title + '</a><div class="flex items-center gap-2 mt-1">' + tags + merged + '<span class="text-xs text-slate-500">' + d.source_name + ' · ' + (d.date || '--') + '</span></div></div></div>';
  }).join('');
  if (itData.length > 20) container.innerHTML += '<div class="text-center text-xs text-slate-500 mt-2">还有 ' + (itData.length - 20) + ' 条IT项目，请查看项目列表</div>';
}

// --- 合并项目 ---
function renderMergedSection() {
  const mergedData = allData.filter(d => d.is_merged);
  const section = document.getElementById('mergedSection');
  if (mergedData.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  document.getElementById('mergedList').innerHTML = mergedData.map(d => {
    const sourceLinks = d.merge_urls.map((url, i) => '<a href="' + url + '" target="_blank" class="text-xs text-blue-400 hover:underline">' + d.merge_sources[i] + '</a>').join(' · ');
    const tags = (d.it_tags||[]).map(t => '<span class="it-badge">' + t + '</span>').join('');
    return '<div class="glass-card p-3"><div class="flex items-start gap-2"><i class="fas fa-link text-orange-400 mt-1"></i><div class="flex-1"><div class="text-sm font-medium">' + d.title + '</div><div class="flex items-center gap-2 mt-1 flex-wrap"><span class="merged-badge">跨' + d.merge_count + '源合并</span>' + tags + '<span class="text-xs text-slate-500">行业: ' + d.industry + '</span></div><div class="text-xs text-slate-400 mt-1">数据来源: ' + sourceLinks + '</div></div></div></div>';
  }).join('');
}

// --- 行业分布图 ---
function renderIndustryChart() {
  const stats = {};
  allData.forEach(d => { const ind = d.industry || '其他'; stats[ind] = (stats[ind] || 0) + 1; });
  const labels = Object.keys(stats);
  const values = Object.values(stats);
  const colors = labels.map(l => {
    if (l === '信息化/IT') return '#7C4DFF';
    return ['#185FA5','#4CAF50','#FF9800','#E91E63','#00BCD4','#8BC34A','#FF5722','#3F51B5','#CDDC39','#795548','#607D8B','#9E9E9E'][labels.indexOf(l) % 12];
  });
  const ctx = document.getElementById('industryChart').getContext('2d');
  if (industryChartInstance) industryChartInstance.destroy();
  industryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 11 }, padding: 8 } }, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + ' 条' } } } }
  });
}

// --- 来源统计图 ---
function renderSourceChart() {
  const stats = {};
  allData.forEach(d => { const sources = d.is_merged ? d.merge_sources : [d.source_name]; sources.forEach(s => { stats[s] = (stats[s] || 0) + 1; }); });
  const labels = Object.keys(stats);
  const values = Object.values(stats);
  const colors = ['#185FA5','#4CAF50','#FF9800','#E91E63','#00BCD4'];
  const ctx = document.getElementById('sourceChart').getContext('2d');
  if (sourceChartInstance) sourceChartInstance.destroy();
  sourceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: '项目数', data: values, backgroundColor: colors }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + ' 条' } } }, scales: { x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148,163,184,0.1)' } }, y: { ticks: { color: '#E2E8F0', font: { size: 12 } }, grid: { color: 'rgba(148,163,184,0.1)' } } } }
  });
}

// ===== OPC企业视图 =====
function renderOPCView() {
  renderLevelChart();
  renderOPCIndustryChart();
  renderOPCGrid();
}

function renderLevelChart() {
  if (!opcData) return;
  const ls = opcData.stats.level_stats || {};
  const labels = Object.keys(ls).filter(k => k !== '未评估');
  const values = labels.map(k => ls[k]);
  const colorMap = {'S':'#FF6F00','A':'#E91E63','B':'#185FA5','C':'#639922','D':'#888780'};
  const colors = labels.map(l => colorMap[l] || '#888780');
  const ctx = document.getElementById('levelChart').getContext('2d');
  if (levelChartInstance) levelChartInstance.destroy();
  levelChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: labels.map(l => l + '级'), datasets: [{ data: values, backgroundColor: colors }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 12 }, padding: 10 } }, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + ' 家' } } } }
  });
}

function renderOPCIndustryChart() {
  if (!opcData) return;
  const is = opcData.stats.industry_stats || {};
  const sorted = Object.entries(is).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);
  const ctx = document.getElementById('opcIndustryChart').getContext('2d');
  if (opcIndustryChartInstance) opcIndustryChartInstance.destroy();
  opcIndustryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: '企业数', data: values, backgroundColor: '#185FA5' }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + ' 家' } } }, scales: { x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148,163,184,0.1)' } }, y: { ticks: { color: '#E2E8F0', font: { size: 11 } }, grid: { color: 'rgba(148,163,184,0.1)' } } } }
  });
}

function setOPCFilter(f) {
  currentOPCFilter = f;
  ['opcTabAll','opcTabB','opcTabC','opcTabD'].forEach(id => {
    document.getElementById(id).className = 'tab-inactive px-3 py-1 rounded text-sm font-medium';
  });
  const tabId = {'all':'opcTabAll','B':'opcTabB','C':'opcTabC','D':'opcTabD'}[f];
  if (tabId) document.getElementById(tabId).className = 'tab-active px-3 py-1 rounded text-sm font-medium';
  renderOPCGrid();
}

function renderOPCGrid() {
  if (!opcData) return;
  const search = (document.getElementById('opcSearchInput').value || '').toLowerCase();
  let ents = opcData.enterprises || [];

  if (currentOPCFilter !== 'all') {
    ents = ents.filter(e => e.capability_level === currentOPCFilter);
  }
  if (search) {
    ents = ents.filter(e => {
      const text = (e.company_name + ' ' + e.industry_tags.join(' ') + ' ' + (e.region||'') + ' ' + e.service_regions.join(' ')).toLowerCase();
      return text.includes(search);
    });
  }

  document.getElementById('opcFilterCount').textContent = '共 ' + ents.length + ' 家';
  const grid = document.getElementById('opcGrid');

  if (ents.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-slate-500 text-center py-8">暂无数据</div>';
    return;
  }

  grid.innerHTML = ents.map(e => {
    const level = e.capability_level || '未评估';
    const score = e.overall_score !== null ? e.overall_score.toFixed(1) : '--';
    const industries = e.industry_tags.map(t => '<span class="it-badge">' + t + '</span>').join('');
    const certs = (e.certifications || []).slice(0, 3).map(c => '<span class="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">' + c + '</span>').join('');
    return '<div class="ent-card glass-card p-4" onclick="showEnterprise(' + e.id + ')">' +
      '<div class="flex items-start justify-between mb-2">' +
        '<div class="flex-1 min-w-0">' +
          '<h4 class="text-sm font-medium text-blue-300 truncate">' + e.company_name + '</h4>' +
          '<p class="text-xs text-slate-500 mt-0.5">' + e.entity_type_label + ' · ' + (e.region || '未填写') + '</p>' +
        '</div>' +
        '<span class="level-badge level-' + level + ' ml-2 flex-shrink-0">' + level + '</span>' +
      '</div>' +
      '<div class="flex items-center gap-2 mb-2">' +
        '<span class="text-lg font-bold ' + (score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-slate-400') + '">' + score + '</span>' +
        '<span class="text-xs text-slate-500">综合评分</span>' +
      '</div>' +
      '<div class="flex flex-wrap gap-1 mb-2">' + industries + '</div>' +
      '<div class="flex flex-wrap gap-1">' + certs + '</div>' +
    '</div>';
  }).join('');
}

// ===== 企业详情弹窗 =====
function showEnterprise(entId) {
  if (!opcData) return;
  const ent = opcData.enterprises.find(e => e.id === entId);
  if (!ent) return;

  document.getElementById('modalCompanyName').textContent = ent.company_name;

  // Meta badges
  const level = ent.capability_level || '未评估';
  const meta = [];
  meta.push('<span class="level-badge level-' + level + '">' + level + '级</span>');
  meta.push('<span class="text-xs text-slate-400">' + ent.entity_type_label + '</span>');
  if (ent.region) meta.push('<span class="text-xs text-slate-400"><i class="fas fa-map-marker-alt mr-1"></i>' + ent.region + '</span>');
  if (ent.qualification_level) meta.push('<span class="text-xs text-slate-400"><i class="fas fa-certificate mr-1"></i>' + ent.qualification_level + '</span>');
  document.getElementById('modalCompanyMeta').innerHTML = meta.join('');

  // Score & level
  const score = ent.overall_score !== null ? ent.overall_score.toFixed(1) : '--';
  document.getElementById('modalScoreBadge').innerHTML = '<span class="' + (score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-slate-400') + '">' + score + '</span><span class="text-sm text-slate-500"> 分</span>';
  document.getElementById('modalLevelBadge').innerHTML = '<span class="level-badge level-' + level + '">' + level + '级</span>';

  // Company info
  const infoRows = [];
  infoRows.push(['企业类型', ent.entity_type_label]);
  infoRows.push(['所在地区', ent.region || '未填写']);
  infoRows.push(['联系人', ent.contact_person || '未填写']);
  infoRows.push(['服务区域', ent.service_regions.join('、') || '未填写']);
  infoRows.push(['行业标签', ent.industry_tags.join('、') || '未填写']);
  infoRows.push(['资质等级', ent.qualification_level || '未填写']);
  if (ent.certifications && ent.certifications.length > 0) {
    infoRows.push(['认证信息', ent.certifications.join('、')]);
  }
  if (ent.business_scope) {
    infoRows.push(['经营范围', ent.business_scope.length > 100 ? ent.business_scope.slice(0,100) + '...' : ent.business_scope]);
  }
  document.getElementById('modalCompanyInfo').innerHTML = infoRows.map(r => 
    '<div class="flex gap-2"><span class="text-slate-500 w-20 flex-shrink-0">' + r[0] + '</span><span class="text-slate-300 flex-1">' + r[1] + '</span></div>'
  ).join('');

  // AI description
  document.getElementById('modalAIDesc').textContent = ent.ai_description || '暂无AI评估描述';

  // Radar chart
  if (ent.scores) {
    renderRadarChart(ent.scores);
  } else {
    document.getElementById('radarChart').parentElement.innerHTML = '<div class="text-slate-500 text-center py-12">暂无评估数据</div>';
  }

  // Matches for this enterprise
  const entMatches = (opcData.top_matches || []).filter(m => m.enterprise_id === entId);
  const matchList = document.getElementById('modalMatchList');
  if (entMatches.length === 0) {
    matchList.innerHTML = '<div class="text-slate-500 text-center py-4">暂无匹配项目</div>';
  } else {
    matchList.innerHTML = entMatches.map(m => {
      const pct = Math.round(m.match_score * 100);
      const color = pct >= 70 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#888780';
      return '<div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30">' +
        '<div class="flex-1 min-w-0">' +
          '<a href="' + (m.project_url||'#') + '" target="_blank" class="text-sm text-blue-300 hover:underline truncate block">' + (m.project_title||'').slice(0,50) + '</a>' +
          '<span class="text-xs text-slate-500">' + (m.project_industry||'') + ' · ' + (m.project_province||'') + '</span>' +
        '</div>' +
        '<div class="flex-shrink-0 text-right">' +
          '<div class="text-sm font-bold" style="color:' + color + '">' + pct + '%</div>' +
          '<div class="text-xs text-slate-500">' + (m.match_level||'') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  document.getElementById('enterpriseModal').style.display = 'flex';
}

function renderRadarChart(scores) {
  const labels = ['资质等级', '技术能力', '历史业绩', '财务状况', '团队规模', '行业认证', '服务区域'];
  const keys = ['qualification', 'technical', 'history', 'financial', 'team', 'certification', 'region'];
  const values = keys.map(k => scores[k] || 0);

  const ctx = document.getElementById('radarChart').getContext('2d');
  if (radarChartInstance) radarChartInstance.destroy();
  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '能力评分',
        data: values,
        backgroundColor: 'rgba(24, 95, 165, 0.2)',
        borderColor: 'rgba(24, 95, 165, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: '#185FA5',
        pointBorderColor: '#fff',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#94A3B8', backdropColor: 'transparent', font: { size: 10 }, stepSize: 20 },
          grid: { color: 'rgba(148,163,184,0.15)' },
          angleLines: { color: 'rgba(148,163,184,0.15)' },
          pointLabels: { color: '#E2E8F0', font: { size: 12 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('enterpriseModal')) return;
  document.getElementById('enterpriseModal').style.display = 'none';
  if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
}

// ===== 匹配结果表 =====
function renderMatchesTable() {
  if (!opcData) return;
  const matches = opcData.top_matches || [];
  const tbody = document.getElementById('matchTableBody');
  if (matches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500">暂无匹配数据</td></tr>';
    return;
  }
  tbody.innerHTML = matches.map((m, i) => {
    const pct = Math.round(m.match_score * 100);
    const color = pct >= 70 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#888780';
    const levelBadge = m.match_level ? '<span class="text-xs px-2 py-0.5 rounded" style="background:' + color + '33;color:' + color + '">' + m.match_level + '</span>' : '';
    return '<tr class="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer" onclick="showEnterprise(' + m.enterprise_id + ')">' +
      '<td class="py-2 px-2 text-slate-500">' + (i+1) + '</td>' +
      '<td class="py-2 px-2 text-blue-300 text-sm">' + (m.enterprise_name||'').slice(0,20) + '</td>' +
      '<td class="py-2 px-2"><a href="' + (m.project_url||'#') + '" target="_blank" class="text-sm text-slate-300 hover:text-blue-400 hover:underline" onclick="event.stopPropagation()">' + ((m.project_title||'').length > 40 ? m.project_title.slice(0,40)+'...' : m.project_title) + '</a></td>' +
      '<td class="py-2 px-2 text-xs text-slate-400">' + (m.project_industry||'--') + '</td>' +
      '<td class="py-2 px-2 text-xs text-slate-400">' + (m.project_province||'--') + '</td>' +
      '<td class="py-2 px-2"><div class="flex items-center gap-2"><div class="match-score-bar w-16"><div class="match-score-fill" style="width:' + pct + '%;background:' + color + '"></div></div><span class="text-sm font-medium" style="color:' + color + '">' + pct + '%</span></div></td>' +
      '<td class="py-2 px-2">' + levelBadge + '</td>' +
    '</tr>';
  }).join('');
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', loadData);
