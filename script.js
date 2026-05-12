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

// Register the datalabels plugin
Chart.register(ChartDataLabels);

async function init() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
        const years = Object.keys(dashboardData);
        
        setupNav(years);
        setupDataFilters(years);
        setupAnalyticsFilters(years);
        
        if (years.length > 0) renderYear(years[0]);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupNav(years) {
    const nav = document.getElementById('year-nav');
    nav.innerHTML = '';
    years.forEach((year) => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.textContent = year.replace('SAMPLES ANALYSED IN ', '');
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
    validYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y.replace('SAMPLES ANALYSED IN ', '');
        yearSelect.appendChild(opt);
    });
    analyticsFilters.year = validYears[0];

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
        item.innerHTML = `
            <input type="checkbox" checked onchange="toggleTest('${test}', this.checked)">
            <span>${test}</span>
        `;
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
    checkboxes.forEach(cb => {
        cb.checked = true;
        const test = cb.nextElementSibling.textContent;
        analyticsFilters.selectedTests.add(test);
    });
    updateAnalytics();
}

function clearAllTests() {
    const checkboxes = document.querySelectorAll('#tests-checklist input');
    checkboxes.forEach(cb => {
        cb.checked = false;
        const test = cb.nextElementSibling.textContent;
        analyticsFilters.selectedTests.delete(test);
    });
    updateAnalytics();
}

function filterChecklist() {
    const query = document.getElementById('test-search').value.toUpperCase();
    const items = document.querySelectorAll('.check-item');
    items.forEach(item => {
        const text = item.querySelector('span').textContent.toUpperCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
}

function renderYear(year, btn) {
    currentYear = year;
    document.getElementById('data-view').style.display = 'block';
    document.getElementById('analytics-view').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    const yearFilter = document.getElementById('year-filter');
    if (yearFilter && !['TOTAL COUNT', 'NGS', 'NICS'].includes(year)) yearFilter.value = year;

    const container = document.getElementById('table-content');
    const headerTitle = document.getElementById('table-title');
    const filterBar = document.querySelector('#data-view .filter-bar');
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
    document.getElementById('data-view').style.display = 'none';
    document.getElementById('analytics-view').style.display = 'flex';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateAnalytics();
}

function updateAnalytics() {
    let data = processYearData(dashboardData[analyticsFilters.year]);
    // Filter by selected tests
    data = data.filter(item => analyticsFilters.selectedTests.has(item.category));
    
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
        if (yearsRow[key] && countsRow[key] !== null) {
            html += `<div class="stat-card fade-in"><span class="stat-label">Year ${yearsRow[key]}</span><span class="stat-value">${countsRow[key]}</span></div>`;
        }
    });
    container.innerHTML = html + '</div>';
}

function applyDataFilters() {
    renderTable(dashboardData[currentYear], document.getElementById('table-content'));
}

function renderTable(dataRows, container) {
    let data = processYearData(dataRows);
    if (currentDataFilters.test !== 'all') data = data.filter(item => item.category === currentDataFilters.test);
    let indices = months.map((_, i) => i);
    if (currentDataFilters.month !== 'all') indices = [parseInt(currentDataFilters.month)];
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
    
    const overallTotal = totals.reduce((a, b) => a + b, 0);
    document.getElementById('bar-total-label').textContent = `Total: ${overallTotal}`;

    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Samples',
                data: totals,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#4338ca',
                    font: { weight: 'bold' }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { display: false } },
                x: { grid: { display: false }, ticks: { font: { weight: '600' } } }
            }
        }
    });
}

function updatePieChart(data) {
    const ctx = document.getElementById('testPieChart').getContext('2d');
    const headerTitle = document.getElementById('pie-chart-title');
    const subTitle = headerTitle.nextElementSibling;
    
    let pData = [], pLabels = [];
    
    if (analyticsFilters.selectedTests.size === 1) {
        // Mode: Monthly distribution for the single selected test
        const testName = [...analyticsFilters.selectedTests][0];
        const testData = data.find(item => item.category === testName);
        headerTitle.textContent = `Monthly Distribution: ${testName}`;
        subTitle.textContent = "Distribution of samples by month";
        
        if (testData) {
            testData.monthly.forEach((val, i) => {
                if (val > 0) {
                    pData.push(val);
                    pLabels.push(months[i]);
                }
            });
        }
    } else {
        // Mode: Test distribution for selected months
        headerTitle.textContent = "Test-wise Sample Count";
        subTitle.textContent = "Distribution of samples by test type";
        
        data.forEach(item => {
            let val = analyticsFilters.month === 'all' ? item.total : item.monthly[parseInt(analyticsFilters.month)];
            if (val > 0) {
                pData.push(val);
                pLabels.push(item.category);
            }
        });
    }
    
    const overallTotal = pData.reduce((a, b) => a + b, 0);
    document.getElementById('pie-total-label').textContent = `Total: ${overallTotal}`;

    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: pLabels,
            datasets: [{
                data: pData,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 11, weight: '600' } } },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 12 },
                    formatter: (value, ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const perc = (value * 100 / total).toFixed(0);
                        return perc > 5 ? value : '';
                    }
                }
            }
        }
    });
}

init();
