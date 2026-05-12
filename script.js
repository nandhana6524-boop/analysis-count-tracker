let dashboardData = {};
let currentYear = '';
let currentDataFilters = { month: 'all', test: 'all' };
let analyticsFilters = { year: '', month: 'all', selectedTests: new Set() };

let barChartInstance = null;
let pieChartInstance = null;

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const chartColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', 
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#2dd4bf'
];

Chart.register(ChartDataLabels);

async function init() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
        const years = Object.keys(dashboardData);
        
        setupNav(years);
        setupDataFilters(years);
        setupAnalyticsFilters(years);
        
        const defaultView = years.includes('TOTAL COUNT') ? 'TOTAL COUNT' : years[0];
        const targetBtn = Array.from(document.querySelectorAll('.tab-btn'))
            .find(btn => btn.textContent === defaultView);
        renderYear(defaultView, targetBtn);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupNav(years) {
    const nav = document.getElementById('year-nav');
    nav.innerHTML = '';
    const categorySheets = years.filter(year => !year.includes('202'));
    
    categorySheets.forEach((year) => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.textContent = year;
        btn.onclick = () => renderYear(year, btn);
        nav.appendChild(btn);
    });

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
    validYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y.replace('SAMPLES ANALYSED IN ', '');
        yearSelect.appendChild(opt);
    });
    if (validYears.length > 0) analyticsFilters.year = validYears[0];

    yearSelect.onchange = (e) => {
        analyticsFilters.year = e.target.value;
        if (document.getElementById('analytics-view').style.display === 'flex') {
            updateAnalytics();
        }
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

    yearSelect.onchange = (e) => { 
        analyticsFilters.year = e.target.value; 
        populateTestsChecklist();
        updateAnalytics(); 
    };
    monthSelect.onchange = (e) => { analyticsFilters.month = e.target.value; updateAnalytics(); };
    
    populateTestsChecklist();
}

function populateTestsChecklist() {
    const container = document.getElementById('tests-checklist');
    const data = processYearData(dashboardData[analyticsFilters.year]);
    const tests = [...new Set(data.map(item => item.category))].sort();
    
    container.innerHTML = '';
    analyticsFilters.selectedTests.clear();
    
    tests.forEach(test => {
        analyticsFilters.selectedTests.add(test);
        const item = document.createElement('label');
        item.className = 'check-item';
        item.innerHTML = `<input type="checkbox" checked onchange="toggleTest('${test}', this.checked)"><span>${test}</span>`;
        container.appendChild(item);
    });
}

function toggleTest(test, isChecked) {
    if (isChecked) analyticsFilters.selectedTests.add(test);
    else analyticsFilters.selectedTests.delete(test);
    updateAnalytics();
}

function selectAllTests() {
    const checkboxes = document.querySelectorAll('#tests-checklist input');
    checkboxes.forEach(cb => { cb.checked = true; analyticsFilters.selectedTests.add(cb.nextElementSibling.textContent); });
    updateAnalytics();
}

function clearAllTests() {
    const checkboxes = document.querySelectorAll('#tests-checklist input');
    checkboxes.forEach(cb => { cb.checked = false; analyticsFilters.selectedTests.delete(cb.nextElementSibling.textContent); });
    updateAnalytics();
}

function filterChecklist() {
    const query = document.getElementById('test-search').value.toUpperCase();
    document.querySelectorAll('.check-item').forEach(item => {
        item.style.display = item.querySelector('span').textContent.toUpperCase().includes(query) ? 'flex' : 'none';
    });
}

function calculateTotals() {
    let totalAll = 0, ngsTotal = 0, nicsTotal = 0, analyticsTotal = 0;

    if (dashboardData['NGS']) ngsTotal = processYearData(dashboardData['NGS']).reduce((sum, item) => sum + item.total, 0);
    if (dashboardData['NICS']) nicsTotal = processYearData(dashboardData['NICS']).reduce((sum, item) => sum + item.total, 0);

    Object.keys(dashboardData).forEach(key => {
        if (!['TOTAL COUNT', 'NGS', 'NICS'].includes(key)) {
            const yearSum = processYearData(dashboardData[key]).reduce((sum, item) => sum + item.total, 0);
            totalAll += yearSum;
            if (key === analyticsFilters.year) analyticsTotal = yearSum;
        }
    });

    return { totalAll, ngsTotal, nicsTotal, analyticsTotal };
}

function renderYear(year, btn) {
    currentYear = year;
    document.getElementById('data-view').style.display = 'block';
    document.getElementById('analytics-view').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    const container = document.getElementById('table-content');
    const headerTitle = document.getElementById('table-title');
    const filterBar = document.querySelector('#data-view .filter-bar');
    container.innerHTML = '';

    if (year === 'TOTAL COUNT') {
        renderHome(container, headerTitle, filterBar);
    } else {
        headerTitle.textContent = `${year} Breakdown`;
        filterBar.style.display = 'flex';
        populateTestDropdown(dashboardData[year]);
        renderTable(dashboardData[year], container);
    }
}

function renderHome(container, headerTitle, filterBar) {
    headerTitle.textContent = "System Summary";
    filterBar.style.display = 'none';
    const totals = calculateTotals();
    container.innerHTML = `
        <div class="summary-stats fade-in" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="summary-card clickable" onclick="renderYearlyBreakdown()">
                <span class="summary-label">TOTAL SAMPLES</span>
                <span class="summary-value">${totals.totalAll.toLocaleString()}</span>
                <span class="card-footer">Click to view yearly breakdown →</span>
            </div>
            <div class="summary-card"><span class="summary-label">NGS TOTAL</span><span class="summary-value">${totals.ngsTotal.toLocaleString()}</span></div>
            <div class="summary-card"><span class="summary-label">NICS TOTAL</span><span class="summary-value">${totals.nicsTotal.toLocaleString()}</span></div>
            <div class="summary-card"><span class="summary-label">YEARLY ANALYTICS</span><span class="summary-value">${totals.analyticsTotal.toLocaleString()}</span></div>
        </div>
    `;
}

function renderYearlyBreakdown() {
    const container = document.getElementById('table-content');
    const headerTitle = document.getElementById('table-title');
    headerTitle.textContent = "Yearly Cumulative Breakdown";
    
    const data = dashboardData['TOTAL COUNT'];
    const yearsRow = data.find(r => r['Unnamed: 0'] === 'YEAR');
    const countsRow = data.find(r => r['Unnamed: 0'] === 'COUNT');
    
    let html = `
        <div style="margin-bottom: 1.5rem;">
            <button class="tab-btn" onclick="renderYear('TOTAL COUNT')">← Back to Summary</button>
        </div>
        <div class="summary-stats fade-in" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
    `;
    
    Object.keys(yearsRow).forEach(key => {
        if (key === 'Unnamed: 0') return;
        const y = yearsRow[key];
        const c = countsRow[key];
        if (y && c !== null) {
            html += `<div class="summary-card"><span class="summary-label">YEAR ${y}</span><span class="summary-value">${c.toLocaleString()}</span></div>`;
        }
    });
    
    container.innerHTML = html + '</div>';
}

function showAnalytics(btn) {
    document.getElementById('data-view').style.display = 'none';
    document.getElementById('analytics-view').style.display = 'flex';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateAnalytics();
}

function updateAnalytics() {
    let data = processYearData(dashboardData[analyticsFilters.year]).filter(item => analyticsFilters.selectedTests.has(item.category));
    updateBarChart(data);
    updatePieChart(data);
}

function processYearData(rows) {
    if (!rows) return [];
    return rows.filter(row => row['Unnamed: 1'] && row['Unnamed: 1'] !== 'TOTAL' && row['Unnamed: 1'] !== 'S. No.' && !row['Unnamed: 1'].toString().includes('Sheet') && row['Unnamed: 1'] !== 'TEST NAME ')
        .map(row => {
            const monthly = [row['Unnamed: 2'], row['Unnamed: 3'], row['Unnamed: 4'], row['Unnamed: 5'], row['Unnamed: 6'], row['Unnamed: 7'], row['Unnamed: 8'], row['Unnamed: 9'], row['Unnamed: 10'], row['Unnamed: 11'], row['Unnamed: 12'], row['Unnamed: 13']].map(v => (typeof v === 'number' ? v : 0));
            return { category: row['Unnamed: 1'].toString().toUpperCase(), monthly, total: monthly.reduce((a, b) => a + b, 0) };
        }).filter(item => item.total > 0);
}

function populateTestDropdown(dataRows) {
    const testSelect = document.getElementById('test-filter');
    const tests = [...new Set(processYearData(dataRows).map(item => item.category))].sort();
    testSelect.innerHTML = '<option value="all">All Tests</option>';
    tests.forEach(test => {
        const opt = document.createElement('option');
        opt.value = test; opt.textContent = test;
        if (test === currentDataFilters.test) opt.selected = true;
        testSelect.appendChild(opt);
    });
}

function applyDataFilters() { renderTable(dashboardData[currentYear], document.getElementById('table-content')); }

function renderTable(dataRows, container) {
    let data = processYearData(dataRows);
    if (currentDataFilters.test !== 'all') data = data.filter(item => item.category === currentDataFilters.test);
    let indices = months.map((_, i) => i);
    if (currentDataFilters.month !== 'all') indices = [parseInt(currentDataFilters.month)];
    let html = `<table><thead><tr><th>Sample Category</th>${indices.map(i => `<th>${months[i]}</th>`).join('')}${currentDataFilters.month === 'all' ? '<th>Total</th>' : ''}</tr></thead><tbody>`;
    data.forEach(item => { html += `<tr><td style="font-weight: 600;">${item.category}</td>${indices.map(i => `<td>${item.monthly[i] || '-'}</td>`).join('')}${currentDataFilters.month === 'all' ? `<td style="font-weight: 800; color: var(--accent-color);">${item.total}</td>` : ''}</tr>`; });
    container.innerHTML = html + `</tbody></table>`;
}

function updateBarChart(data) {
    const ctx = document.getElementById('monthlyTotalChart').getContext('2d');
    const totals = new Array(12).fill(0);
    data.forEach(item => item.monthly.forEach((v, i) => totals[i] += v));
    document.getElementById('bar-total-label').textContent = `Total: ${totals.reduce((a, b) => a + b, 0)}`;
    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Samples', data: totals, backgroundColor: 'rgba(99, 102, 241, 0.8)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: '#4338ca', font: { weight: 'bold' } } }, scales: { y: { beginAtZero: true, grid: { display: false }, ticks: { display: false } }, x: { grid: { display: false }, ticks: { font: { weight: '600' } } } } }
    });
}

function updatePieChart(data) {
    const ctx = document.getElementById('testPieChart').getContext('2d');
    const headerTitle = document.getElementById('pie-chart-title');
    const subTitle = headerTitle.nextElementSibling;
    let pData = [], pLabels = [];
    if (analyticsFilters.selectedTests.size === 1) {
        const testName = [...analyticsFilters.selectedTests][0];
        const testData = data.find(item => item.category === testName);
        headerTitle.textContent = `Monthly Distribution: ${testName}`;
        subTitle.textContent = "Distribution of samples by month";
        if (testData) testData.monthly.forEach((val, i) => { if (val > 0) { pData.push(val); pLabels.push(months[i]); } });
    } else {
        headerTitle.textContent = "Test-wise Sample Count";
        subTitle.textContent = "Distribution of samples by test type";
        data.forEach(item => {
            let val = analyticsFilters.month === 'all' ? item.total : item.monthly[parseInt(analyticsFilters.month)];
            if (val > 0) { pData.push(val); pLabels.push(item.category); }
        });
    }
    document.getElementById('pie-total-label').textContent = `Total: ${pData.reduce((a, b) => a + b, 0)}`;
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: { labels: pLabels, datasets: [{ data: pData, backgroundColor: chartColors, borderWidth: 2, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 11, weight: '600' } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value, ctx) => { const total = ctx.dataset.data.reduce((a, b) => a + b, 0); return (value * 100 / total).toFixed(0) > 5 ? value : ''; } } } }
    });
}

init();
