let dashboardData = {};
let currentYear = '';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function init() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
        
        const years = Object.keys(dashboardData);
        setupNav(years);
        
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

function renderYear(year, btn) {
    currentYear = year;
    
    // Update nav UI
    if (btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    const dataRows = dashboardData[year];
    const container = document.getElementById('table-view');
    const headerTitle = document.querySelector('h2');
    
    if (year === 'TOTAL COUNT') {
        headerTitle.textContent = "Yearly Cumulative Samples";
        renderStatCards(dataRows, container);
    } else {
        headerTitle.textContent = "Detailed Monthly Breakdown";
        renderTable(dataRows, container);
    }
}

function renderStatCards(rows, container) {
    // Expected structure for TOTAL COUNT:
    // row 0: { Unnamed: 0: 'YEAR', Unnamed: 1: '2018', ... }
    // row 1: { Unnamed: 0: 'COUNT', Unnamed: 1: '33', ... }
    
    const yearsRow = rows.find(r => r['Unnamed: 0'] === 'YEAR');
    const countsRow = rows.find(r => r['Unnamed: 0'] === 'COUNT');
    
    if (!yearsRow || !countsRow) {
        container.innerHTML = "<p>Data not available for stat cards.</p>";
        return;
    }

    let html = '<div class="stats-grid">';
    
    // Iterate through all keys except 'Unnamed: 0'
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
    // Filter and process data
    const processedData = dataRows
        .filter(row => row['Unnamed: 1'] && row['Unnamed: 1'] !== 'TOTAL' && row['Unnamed: 1'] !== 'S. No.' && !row['Unnamed: 1'].toString().includes('Sheet') && row['Unnamed: 1'] !== 'TEST NAME ')
        .map(row => {
            const monthlyValues = [
                row['Unnamed: 2'], row['Unnamed: 3'], row['Unnamed: 4'], row['Unnamed: 5'],
                row['Unnamed: 6'], row['Unnamed: 7'], row['Unnamed: 8'], row['Unnamed: 9'],
                row['Unnamed: 10'], row['Unnamed: 11'], row['Unnamed: 12'], row['Unnamed: 13']
            ].map(v => (typeof v === 'number' ? v : 0));

            return {
                category: row['Unnamed: 1'],
                monthly: monthlyValues,
                total: monthlyValues.reduce((a, b) => a + b, 0)
            };
        })
        .filter(item => item.total > 0);

    let html = `<table>
        <thead>
            <tr>
                <th>Sample Category</th>
                ${months.map(m => `<th>${m}</th>`).join('')}
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
    `;

    processedData.forEach(item => {
        html += `
            <tr>
                <td style="font-weight: 600;">${item.category}</td>
                ${item.monthly.map(v => `<td>${v || '-'}</td>`).join('')}
                <td style="font-weight: 800; color: var(--accent-color);">${item.total}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

init();
