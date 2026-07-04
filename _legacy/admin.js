// Register the datalabels plugin
Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const newOrdersCol = document.getElementById('new-orders');
    const inProgressCol = document.getElementById('processing-orders'); 
    const readyCol = document.getElementById('ready-orders'); 
    const logoutBtn = document.querySelector('a[href="/logout"]'); 
    const pageTitle = document.getElementById('page-title');
    const chartTitle = document.getElementById('chart-title');

    // --- Page Navigation Selectors ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pageSections = document.querySelectorAll('.admin-page-section');
    const priceForm = document.getElementById('price-form');
    const priceStatus = document.getElementById('price-status');

    // --- Sidebar Toggle ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if(sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
        });
    }

    // --- Stats Bar Element Selectors ---
    const statsRevenue = document.getElementById('stats-total-revenue');
    const statsTotalOrders = document.getElementById('stats-total-orders');
    const statsPendingOrders = document.getElementById('stats-pending-orders');
    
    // --- Chart Elements ---
    const chartFilters = document.getElementById('chart-filters');
    const revenueChartCanvas = document.getElementById('revenue-chart');
    let revenueChart = null; 

    // --- NAVIGATION LOGIC ---
    function showPage(pageId) {
        pageSections.forEach(section => {
            section.classList.add('hidden');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        // Update Title and Active Link
        navLinks.forEach(link => {
            const isActive = link.dataset.page === pageId;
            link.classList.toggle('active', isActive);
            if (isActive) {
                const linkText = link.querySelector('span')?.textContent || link.textContent.trim();
                pageTitle.textContent = linkText;
            }
        });
        
        // Load data for the specific page
        if (pageId === 'queue') {
            fetchOrders(); 
            loadStats(); 
            fetchChartData('month-by-week');
        } else if (pageId === 'pricing') {
            loadCurrentPrices(); 
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            showPage(pageId);
            window.location.hash = pageId; 
        });
    });

    // Check URL hash on load
    const initialPage = window.location.hash.substring(1) || 'queue';
    showPage(initialPage);

    // --- LOGOUT ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            fetch('/logout', { method: 'POST' })
                .then(() => window.location.href = '/login.html');
        });
    }

    // --- WebSocket Connection ---
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${wsProtocol}://${window.location.host}`);

    ws.onopen = () => console.log('Admin WebSocket connected.');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_order') {
            console.log('New order received:', data.payload);
            const orderCard = createOrderCard(data.payload);
            if (newOrdersCol) {
                newOrdersCol.prepend(orderCard); 
            }
            loadStats(); 
            fetchChartData(document.querySelector('.chart-filter-btn.active')?.dataset.range || 'month-by-week'); // Refresh chart
        } else if (data.type === 'status_update') {
            loadStats(); 
        }
    };
    ws.onclose = () => {
        console.log('WebSocket disconnected. Attempting to reconnect...');
        setTimeout(() => window.location.reload(), 3000); 
    };

    // --- Load Initial Orders for Queue ---
    async function fetchOrders() {
        try {
            const res = await fetch('/api/orders');
            if (!res.ok) {
                if (res.status === 401) window.location.href = '/login.html';
                throw new Error('Failed to fetch orders');
            }
            const orders = await res.json();
            
            if (newOrdersCol) newOrdersCol.innerHTML = '';
            if (inProgressCol) inProgressCol.innerHTML = '';
            if (readyCol) readyCol.innerHTML = '';

            orders.forEach(order => {
                const orderCard = createOrderCard(order);
                if (order.status === 'new' && newOrdersCol) {
                    newOrdersCol.appendChild(orderCard);
                } else if (order.status === 'processing' && inProgressCol) {
                    inProgressCol.appendChild(orderCard);
                } else if (order.status === 'ready' && readyCol) {
                    readyCol.appendChild(orderCard);
                }
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    // --- Function to Load Dashboard Stats ---
    async function loadStats() {
        try {
            const res = await fetch('/api/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const stats = await res.json();

            if (statsRevenue) statsRevenue.textContent = `₹${(stats.totalRevenue || 0).toFixed(2)}`;
            if (statsTotalOrders) statsTotalOrders.textContent = stats.totalOrders || 0;
            if (statsPendingOrders) statsPendingOrders.textContent = stats.pendingOrders || 0;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // --- Create HTML for an Order Card ---
    function createOrderCard(order) {
        const card = document.createElement('div');
        card.id = order.id; 
        card.className = 'bg-gray-800/70 p-4 rounded-lg shadow border border-gray-700 space-y-3 order-card';
        const time = new Date(order.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
        const priceDisplay = `<p class="text-lg font-bold text-green-400">₹${(order.price || 0).toFixed(2)}</p>`;
        const downloadLink = `<a href="/${order.filePath}" download="${order.fileName || 'download'}" class="block w-full text-center bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">Download File</a>`;
        const message = encodeURIComponent(`Hi! Your SRMAP Stationery order (${order.tokenId}) is ready for pickup.`);
        const whatsappLink = `<a href="https://wa.me/${order.phone}?text=${message}" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>${order.phone}</a>`;

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs font-medium text-gray-400">${time}</span>
                    <h3 class="text-2xl font-extrabold text-indigo-400">${order.tokenId}</h3>
                </div>
                ${priceDisplay}
            </div>
            <p class="text-sm text-gray-200">${order.details}</p>
            ${whatsappLink}
            ${downloadLink} 
            <div class="flex gap-2">
                ${order.status === 'new' ? '<button data-action="processing" class="flex-1 bg-green-500 text-white text-sm font-semibold py-2 px-3 rounded-lg hover:bg-green-600">Start Processing</button>' : ''}
                ${order.status === 'processing' ? '<button data-action="ready" class="flex-1 bg-yellow-500 text-white text-sm font-semibold py-2 px-3 rounded-lg hover:bg-yellow-600">Ready for Pickup</button>' : ''}
                ${order.status === 'ready' ? `<span class="flex-1 text-center text-sm font-semibold text-gray-400">Completed. <br> (Notified Student)</span>` : ''}
            </div>
        `;
        card.querySelector('button[data-action]')?.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            updateOrderStatus(order.id, action);
        });
        return card;
    }

    // --- Update Order Status ---
    async function updateOrderStatus(orderId, newStatus) {
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error('Failed to update status');
            const updatedOrder = await res.json();
            document.getElementById(orderId)?.remove();
            const updatedCard = createOrderCard(updatedOrder);
            if (updatedOrder.status === 'processing' && inProgressCol) {
                inProgressCol.prepend(updatedCard);
            } else if (updatedOrder.status === 'ready' && readyCol) {
                readyCol.prepend(updatedCard);
            }
            loadStats(); 
        } catch (error) {
            console.error('Full error in updateOrderStatus:', error);
        }
    }

    // --- Price Management Logic ---
    async function loadCurrentPrices() {
        try {
            const res = await fetch('/api/prices');
            if (!res.ok) throw new Error('Failed to fetch prices');
            const prices = await res.json();
            
            if (priceForm) {
                priceForm.elements.bw.value = prices.bw || 2;
                priceForm.elements.color.value = prices.color || 10;
                priceForm.elements.spiral.value = prices.spiral || 30;
                priceForm.elements.firstPageColor.value = prices.firstPageColor || 8;
                priceForm.elements.doubleSided.value = prices.doubleSided || -0.5;
                priceForm.elements.photo_4x6.value = prices.photo_4x6 || 15;
                priceForm.elements.passport.value = prices.passport || 50;
                priceForm.elements.rush.value = prices.rush || 20;
            }
        } catch (error) {
            console.error(error);
            if(priceStatus) priceStatus.textContent = 'Could not load prices.';
        }
    }

    if (priceForm) {
        priceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPrices = {
                bw: parseFloat(priceForm.elements.bw.value),
                color: parseFloat(priceForm.elements.color.value),
                spiral: parseFloat(priceForm.elements.spiral.value),
                firstPageColor: parseFloat(priceForm.elements.firstPageColor.value),
                doubleSided: parseFloat(priceForm.elements.doubleSided.value),
                photo_4x6: parseFloat(priceForm.elements.photo_4x6.value),
                passport: parseFloat(priceForm.elements.passport.value),
                rush: parseFloat(priceForm.elements.rush.value),
                singleSided: 0 
            };
            
            try {
                const res = await fetch('/api/prices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPrices)
                });
                if (!res.ok) throw new Error('Failed to save prices');
                
                if(priceStatus) {
                    priceStatus.textContent = 'Prices updated successfully!';
                    priceStatus.className = 'text-green-400 mt-4';
                    setTimeout(() => priceStatus.textContent = '', 3000);
                }
            } catch (error) {
                console.error(error);
                if(priceStatus) {
                    priceStatus.textContent = 'Error saving prices.';
                    priceStatus.className = 'text-red-400 mt-4';
                }
            }
        });
    }

    // --- Chart Logic ---
    async function fetchChartData(range = 'month-by-week') {
        console.log(`Fetching chart data for range: ${range}`); 
        try {
            const res = await fetch(`/api/chart-data?range=${range}`);
            if (!res.ok) throw new Error(`Failed to fetch chart data for range: ${range}`);
            const data = await res.json();
            console.log("Received chart data:", data); 
            
            let title = 'Revenue Overview';
            if (range === 'month-by-week') title = 'This Month by Week';
            else if (range === 'year-by-month') title = 'This Year by Month';
            else if (range === 'all-years') title = 'Revenue by Year';
            chartTitle.textContent = title;

            renderChart(data.labels, data.data);
            
            // Update active button style
            document.querySelectorAll('.chart-filter-btn').forEach(btn => {
                
                btn.classList.remove('bg-indigo-500', 'text-white');
                
                btn.classList.add('bg-gray-700', 'text-gray-300');
                
                if (btn.dataset.range === range) {
                    
                    btn.classList.remove('bg-gray-700', 'text-gray-300');
                    btn.classList.add('bg-indigo-500', 'text-white');
                }
            });
        } catch (error) { 
            console.error(error);
        }
    }

    function renderChart(labels, data) {
        if (!revenueChartCanvas) return;
        const ctx = revenueChartCanvas.getContext('2d');
        
        if (revenueChart) {
            revenueChart.destroy(); 
        }

        revenueChart = new Chart(ctx, {
            type: 'bar', 
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: data,
                        backgroundColor: 'rgba(99, 102, 241, 0.6)', 
                        borderColor: '#818CF8', 
                        borderWidth: 1,
                        borderRadius: 4,
                        
                        type: 'line',
                        tension: 0.3,
                        fill: false,
                        pointBackgroundColor: '#818CF8',
                        pointBorderColor: '#fff',
                        pointHoverRadius: 6,
                        pointRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9CA3AF', 
                            callback: (value) => `₹${value}`
                        },
                        grid: {
                            color: '#374151' 
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9CA3AF' 
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#fff',
                        font: {
                            weight: 'bold'
                        },
                        formatter: (value) => value > 0 ? `₹${value}` : '',
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1F2937', 
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: (context) => `Revenue: ₹${context.raw}`
                        }
                    }
                }
            }
        });
    }

    if(chartFilters) {
        chartFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-filter-btn')) {
                const range = e.target.dataset.range;
                fetchChartData(range);
            }
        });
    }

    // Lucide Icons
    try { lucide.createIcons(); } catch (e) { console.error("Lucide failed:", e); }
});
