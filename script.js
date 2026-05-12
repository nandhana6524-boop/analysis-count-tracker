let dashboardData = {};
let currentYear = '';
let currentFilters = {
    month: 'all',
    test: 'all'
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function init() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
        
        const years = Object.keys(dashboardData);
        setupNav(years);
        setupFilters(years);
        
        if (years.length > 0) {
            renderYear(years[0]);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupNav(years) {
    const nav = document.getElementById('year-nav');
    years.forEach((year, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = year.replace('SAMPLES ANALYSED IN ', '');
        btn.onclick = () => renderYear(year, btn);
        nav.appendChild(btn);
    });
}

function setupFilters(years) {
    const yearSelect = document.getElementById('year-filter');
    const monthSelect = document.getElementById('month-filter');
    const testSelect = document.getElementById('test-filter');

    // Populate years (excluding special non-year sheets)
    years.filter(year => !['TOTAL COUNT', 'NGS', 'NICS'].includes(year)).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year.replace('SAMPLES ANALYSED IN ', '');
        yearSelect.appendChild(option);
    });

    yearSelect.onchange = (e) => {
        const selectedYear = e.target.value;
        const targetBtn = Array.from(document.querySelectorAll('.tab-btn'))
            .find(btn => btn.textContent === selectedYear.replace('SAMPLES ANALYSED IN ', ''));
        renderYear(selectedYear, targetBtn);
    };

    monthSelect.onchange = (e) => {
        currentFilters.month = e.target.value;
        applyFilters();
    };

    testSelect.onchange = (e) => {
        currentFilters.test = e.target.value;
        applyFilters();
    };
}

function applyFilters() {
    if (currentYear === 'TOTAL COUNT') return;
    
    const dataRows = dashboardData[currentYear];
    const container = document.getElementById('table-view');
    renderTable(dataRows, container);
}

function populateTestDropdown(dataRows) {
    const testSelect = document.getElementById('test-filter');
    const tests = [...new Set(dataRows
        .filter(row => row['Unnamed: 1'] && row['Unnamed: 1'] !== 'TOTAL' && row['Unnamed: 1'] !== 'S. No.' && !row['Unnamed: 1'].toString().includes('Sheet') && row['Unnamed: 1'] !== 'TEST NAME ')
        .map(row => row['Unnamed: 1'].toString().toUpperCase()))].sort();
    
    // Clear and keep "All Tests"
    testSelect.innerHTML = '<option value="all">All Tests</option>';
    tests.forEach(test => {
        const option = document.createElement('option');
        option.value = test;
        option.textContent = test;
        if (test === currentFilters.test) option.selected = true;
        testSelect.appendChild(option);
    });
}

function renderYear(year, btn) {
    currentYear = year;
    
    // Update nav and dropdown UI
    if (btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    document.getElementById('year-filter').value = year;

    const dataRows = dashboardData[year];
    const container = document.getElementById('table-view');
    const headerTitle = document.getElementById('table-title');
    const filterBar = document.querySelector('.filter-bar');
    
    if (year === 'TOTAL COUNT') {
        headerTitle.textContent = "Yearly Cumulative Samples";
        filterBar.style.display = 'none';
        renderStatCards(dataRows, container);
    } else {
        headerTitle.textContent = "Detailed Monthly Breakdown";
        filterBar.style.display = 'flex';
        populateTestDropdown(dataRows);
        renderTable(dataRows, container);
    }
}

function renderStatCards(rows, container) {
    const yearsRow = rows.find(r => r['Unnamed: 0'] === 'YEAR');
    const countsRow = rows.find(r => r['Unnamed: 0'] === 'COUNT');
    
    if (!yearsRow || !countsRow) {
        container.innerHTML = "<p>Data not available for stat cards.</p>";
        return;
    }

    let html = '<div class="stats-grid">';
    Object.keys(yearsRow).forEach(key => {
        if (key === 'Unnamed: 0') return;
        const year = yearsRow[key];
        const count = countsRow[key];
        if (year && count !== null) {
            html += `
                <div class="stat-card fade-in">
                    <span class="stat-label">Year ${year}</span>
                    <span class="stat-value">${count}</span>
                </div>
            `;
        }
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderTable(dataRows, container) {
    let processedData = dataRows
        .filter(row => row['Unnamed: 1'] && row['Unnamed: 1'] !== 'TOTAL' && row['Unnamed: 1'] !== 'S. No.' && !row['Unnamed: 1'].toString().includes('Sheet') && row['Unnamed: 1'] !== 'TEST NAME ')
        .map(row => {
            const monthlyValues = [
                row['Unnamed: 2'], row['Unnamed: 3'], row['Unnamed: 4'], row['Unnamed: 5'],
                row['Unnamed: 6'], row['Unnamed: 7'], row['Unnamed: 8'], row['Unnamed: 9'],
                row['Unnamed: 10'], row['Unnamed: 11'], row['Unnamed: 12'], row['Unnamed: 13']
            ].map(v => (typeof v === 'number' ? v : 0));

            return {
                category: row['Unnamed: 1'].toString().toUpperCase(),
                monthly: monthlyValues,
                total: monthlyValues.reduce((a, b) => a + b, 0)
            };
        })
        .filter(item => item.total > 0);

    // Apply Test Filter
    if (currentFilters.test !== 'all') {
        processedData = processedData.filter(item => item.category === currentFilters.test);
    }

    // Determine displayed months
    let displayedMonthIndices = months.map((_, i) => i);
    if (currentFilters.month !== 'all') {
        displayedMonthIndices = [parseInt(currentFilters.month)];
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Sample Category</th>
                ${displayedMonthIndices.map(i => `<th>${months[i]}</th>`).join('')}
                ${currentFilters.month === 'all' ? '<th>Total</th>' : ''}
            </tr>
        </thead>
        <tbody>
    `;

    processedData.forEach(item => {
        html += `
            <tr>
                <td style="font-weight: 600;">${item.category}</td>
                ${displayedMonthIndices.map(i => `<td>${item.monthly[i] || '-'}</td>`).join('')}
                ${currentFilters.month === 'all' ? `<td style="font-weight: 800; color: var(--accent-color);">${item.total}</td>` : ''}
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

init();
