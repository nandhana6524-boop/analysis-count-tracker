let dashboardData = {};
let currentYear = '';
let currentDataFilters = { month: 'all', test: 'all' };
let analyticsFilters = { year: '', month: 'all' };

let barChartInstance = null;
let pieChartInstance = null;

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const chartColors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'];

async function init() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
        const years = Object.keys(dashboardData);
        
        setupNav(years);
        setupDataFilters(years);
        setupAnalyticsFilters(years);
        
        // Default view: first year tab
        if (years.length > 0) {
            renderYear(years[0]);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupNav(years) {
    const nav = document.getElementById('year-nav');
    nav.innerHTML = ''; // Clear existing
    
    years.forEach((year) => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.textContent = year.replace('SAMPLES ANALYSED IN ', '');
        btn.onclick = () => renderYear(year, btn);
        nav.appendChild(btn);
    });

    // Add Analytics Tab
    const analyticsBtn = document.createElement('button');
    analyticsBtn.className = 'tab-btn';
    analyticsBtn.textContent = 'ANALYTICS';
    analyticsBtn.onclick = () => showAnalytics(analyticsBtn);
    nav.appendChild(analyticsBtn);
}

function setupDataFilters(years) {
    const yearSelect = document.getElementById('year-filter');
    const monthSelect = document.getElementById('month-filter');
    const testSelect = document.getElementById('test-filter');

    const validYears = years.filter(y => !['TOTAL COUNT', 'NGS', 'NICS'].includes(y));
    yearSelect.innerHTML = '';
    validYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y.replace('SAMPLES ANALYSED IN ', '');
        yearSelect.appendChild(opt);
    });

    yearSelect.onchange = (e) => {
        const targetBtn = Array.from(document.querySelectorAll('.tab-btn'))
            .find(btn => btn.textContent === e.target.value.replace('SAMPLES ANALYSED IN ', ''));
        renderYear(e.target.value, targetBtn);
    };
    monthSelect.onchange = (e) => { currentDataFilters.month = e.target.value; applyDataFilters(); };
    testSelect.onchange = (e) => { currentDataFilters.test = e.target.value; applyDataFilters(); };
}

function setupAnalyticsFilters(years) {
    const yearSelect = document.getElementById('analytics-year-filter');
    const monthSelect = document.getElementById('analytics-month-filter');

    const validYears = years.filter(y => !['TOTAL COUNT', 'NGS', 'NICS'].includes(y));
    yearSelect.innerHTML = '';
    validYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y.replace('SAMPLES ANALYSED IN ', '');
        yearSelect.appendChild(opt);
    });
    analyticsFilters.year = validYears[0];

    yearSelect.onchange = (e) => { analyticsFilters.year = e.target.value; updateAnalytics(); };
    monthSelect.onchange = (e) => { analyticsFilters.month = e.target.value; updateAnalytics(); };
}

function applyDataFilters() {
    const container = document.getElementById('table-content');
    renderTable(dashboardData[currentYear], container);
}

function renderYear(year, btn) {
    currentYear = year;
    
    // Switch View
    document.getElementById('data-view').style.display = 'block';
    document.getElementById('analytics-view').style.display = 'none';
    
    // Update Tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Sync Filter Dropdown
    const yearFilter = document.getElementById('year-filter');
    if (yearFilter && !['TOTAL COUNT', 'NGS', 'NICS'].includes(year)) {
        yearFilter.value = year;
    }

    const container = document.getElementById('table-content');
    const headerTitle = document.getElementById('table-title');
    const filterBar = document.querySelector('#data-view .filter-bar');
    
    // Clear container before rendering
    container.innerHTML = '';

    if (year === 'TOTAL COUNT') {
        headerTitle.textContent = "Yearly Cumulative Samples";
        filterBar.style.display = 'none';
        renderStatCards(dashboardData[year], container);
    } else {
        headerTitle.textContent = "Detailed Monthly Breakdown";
        filterBar.style.display = 'flex';
        populateTestDropdown(dashboardData[year]);
        renderTable(dashboardData[year], container);
    }
}

function showAnalytics(btn) {
    // Switch View
    document.getElementById('data-view').style.display = 'none';
    document.getElementById('analytics-view').style.display = 'block';
    
    // Update Tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    updateAnalytics();
}

function updateAnalytics() {
    const rawData = dashboardData[analyticsFilters.year];
    const data = processYearData(rawData);
    updateBarChart(data);
    updatePieChart(data);
}

function processYearData(rows) {
    if (!rows) return [];
    return rows
        .filter(row => row['Unnamed: 1'] && row['Unnamed: 1'] !== 'TOTAL' && row['Unnamed: 1'] !== 'S. No.' && !row['Unnamed: 1'].toString().includes('Sheet') && row['Unnamed: 1'] !== 'TEST NAME ')
        .map(row => {
            const monthly = [row['Unnamed: 2'], row['Unnamed: 3'], row['Unnamed: 4'], row['Unnamed: 5'], row['Unnamed: 6'], row['Unnamed: 7'], row['Unnamed: 8'], row['Unnamed: 9'], row['Unnamed: 10'], row['Unnamed: 11'], row['Unnamed: 12'], row['Unnamed: 13']].map(v => (typeof v === 'number' ? v : 0));
            return { category: row['Unnamed: 1'].toString().toUpperCase(), monthly, total: monthly.reduce((a, b) => a + b, 0) };
        })
        .filter(item => item.total > 0);
}

function populateTestDropdown(dataRows) {
    const testSelect = document.getElementById('test-filter');
    const data = processYearData(dataRows);
    const tests = [...new Set(data.map(item => item.category))].sort();
    
    testSelect.innerHTML = '<option value="all">All Tests</option>';
    tests.forEach(test => {
        const opt = document.createElement('option');
        opt.value = test; opt.textContent = test;
        if (test === currentDataFilters.test) opt.selected = true;
        testSelect.appendChild(opt);
    });
}

function renderStatCards(rows, container) {
    const yearsRow = rows.find(r => r['Unnamed: 0'] === 'YEAR');
    const countsRow = rows.find(r => r['Unnamed: 0'] === 'COUNT');
    if (!yearsRow || !countsRow) return;

    let html = '<div class="stats-grid">';
    Object.keys(yearsRow).forEach(key => {
        if (key === 'Unnamed: 0') return;
        const y = yearsRow[key];
        const c = countsRow[key];
        if (y && c !== null) {
            html += `<div class="stat-card fade-in"><span class="stat-label">Year ${y}</span><span class="stat-value">${c}</span></div>`;
        }
    });
    container.innerHTML = html + '</div>';
}

function renderTable(dataRows, container) {
    let data = processYearData(dataRows);
    
    // Apply Filters (Data View only)
    if (currentDataFilters.test !== 'all') {
        data = data.filter(item => item.category === currentDataFilters.test);
    }
    
    let indices = months.map((_, i) => i);
    if (currentDataFilters.month !== 'all') {
        indices = [parseInt(currentDataFilters.month)];
    }

    let html = `<table><thead><tr><th>Sample Category</th>${indices.map(i => `<th>${months[i]}</th>`).join('')}${currentDataFilters.month === 'all' ? '<th>Total</th>' : ''}</tr></thead><tbody>`;
    data.forEach(item => {
        html += `<tr><td style="font-weight: 600;">${item.category}</td>${indices.map(i => `<td>${item.monthly[i] || '-'}</td>`).join('')}${currentDataFilters.month === 'all' ? `<td style="font-weight: 800; color: var(--accent-color);">${item.total}</td>` : ''}</tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function updateBarChart(data) {
    const ctx = document.getElementById('monthlyTotalChart').getContext('2d');
    const totals = new Array(12).fill(0);
    data.forEach(item => item.monthly.forEach((v, i) => totals[i] += v));
    
    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Total Samples', data: totals, backgroundColor: 'rgba(14, 165, 233, 0.7)', borderColor: '#0ea5e9', borderWidth: 1, borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748b' } }, x: { grid: { display: false }, ticks: { color: '#64748b' } } } }
    });
}

function updatePieChart(data) {
    const ctx = document.getElementById('testPieChart').getContext('2d');
    const headerTitle = document.querySelector('#testPieChart').parentElement.querySelector('h3');
    
    let pData = [], pLabels = [];
    data.forEach(item => {
        let val = analyticsFilters.month === 'all' ? item.total : item.monthly[parseInt(analyticsFilters.month)];
        if (val > 0) { pData.push(val); pLabels.push(item.category); }
    });
    
    headerTitle.textContent = analyticsFilters.month === 'all' ? "Yearly Test Distribution" : `Test Distribution (${months[analyticsFilters.month]})`;

    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: { labels: pLabels, datasets: [{ data: pData, backgroundColor: chartColors, borderWidth: 2, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 10 } } } } }
    });
}

init();
