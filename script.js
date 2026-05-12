let dashboardData = {};
let currentYear = '';
let chartInstance = null;

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
    
    // Process data for table and chart
    // We assume Unnamed: 1 is the category and Unnamed: 2-13 are Jan-Dec
    const processedData = dataRows.filter(row => row['Unnamed: 1'] && row['Unnamed: 1'] !== 'TOTAL' && row['Unnamed: 1'] !== 'S. No.' && !row['Unnamed: 1'].toString().includes('Sheet')).map(row => {
        return {
            category: row['Unnamed: 1'],
            monthly: [
                row['Unnamed: 2'], row['Unnamed: 3'], row['Unnamed: 4'], row['Unnamed: 5'],
                row['Unnamed: 6'], row['Unnamed: 7'], row['Unnamed: 8'], row['Unnamed: 9'],
                row['Unnamed: 10'], row['Unnamed: 11'], row['Unnamed: 12'], row['Unnamed: 13']
            ].map(v => typeof v === 'number' ? v : 0)
        };
    });

    // Find the TOTAL row for trends
    const totalRow = dataRows.find(row => row['Unnamed: 1'] === 'TOTAL');
    let trends = [0,0,0,0,0,0,0,0,0,0,0,0];
    if (totalRow) {
        trends = [
            totalRow['Unnamed: 2'], totalRow['Unnamed: 3'], totalRow['Unnamed: 4'], totalRow['Unnamed: 5'],
            totalRow['Unnamed: 6'], totalRow['Unnamed: 7'], totalRow['Unnamed: 8'], totalRow['Unnamed: 9'],
            totalRow['Unnamed: 10'], totalRow['Unnamed: 11'], totalRow['Unnamed: 12'], totalRow['Unnamed: 13']
        ].map(v => typeof v === 'number' ? v : 0);
    }

    updateChart(trends);
    updateTable(processedData);
}

function updateChart(trends) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Total Samples',
                data: trends,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#38bdf8',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function updateTable(data) {
    const container = document.getElementById('table-view');
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

    data.forEach(item => {
        const rowTotal = item.monthly.reduce((a, b) => a + b, 0);
        html += `
            <tr>
                <td style="font-weight: 600;">${item.category}</td>
                ${item.monthly.map(v => `<td>${v || '-'}</td>`).join('')}
                <td style="font-weight: 800; color: var(--accent-color);">${rowTotal}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

init();
