let symbol = 'ethusdt'; // Default symbol
let interval = '1m';    // Default interval
let previousInterval = interval; // Track previous interval
let ws;                 // WebSocket variable

const historicalData = {
    ethusdt: [],
    bnbusdt: [],
    dotusdt: []
};

let myChart;           // Variable to hold the Chart.js instance
const chartData = {
    datasets: [{
        label: 'Candlestick',
        data: [] // This will hold our candlestick data
    }]
};

// Function to create the chart
function createChart() {
    const ctx = document.getElementById('candlestickChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'candlestick',
        data: chartData,
        options: {
            layout: {
                padding: {
                    left: 20,
                    right: 20,
                    top: 20,
                    bottom: 20
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10 // Limit number of ticks on x-axis
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (USDT)'
                    },
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function connectWebSocket() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`);

    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        const kline = message.k;
        if (kline.x) { 
            const candlestickData = {
                time: new Date(kline.t),
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c)
            };
            console.log("Received kline:", candlestickData); // Log incoming kline data
            updateChart(candlestickData);
            saveHistoricalData(); // Save historical data after receiving new kline
        }
    };

    ws.onopen = function() {
        console.log(`Connected to WebSocket for ${symbol} at ${interval}`);
    };

    ws.onclose = function() {
        console.log('WebSocket connection closed');
    };

    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

function updateChart(data) {
    // Store new candlestick data in historicalData
    historicalData[symbol].push({
        x: data.time,
        o: data.open,
        h: data.high,
        l: data.low,
        c: data.close
    });

    // Update the chart with new candlestick data
    chartData.datasets[0].data.push({
        x: data.time,
        o: data.open,
        h: data.high,
        l: data.low,
        c: data.close
    });

    // Limit the number of candles displayed (optional)
    if (chartData.datasets[0].data.length > 100) { // Keep only the last 100 candles
        chartData.datasets[0].data.shift(); // Remove the oldest candle
    }

    myChart.update();
}

function loadHistoricalData() {
   for (const coin of Object.keys(historicalData)) {
       const storedData = localStorage.getItem(coin);
       if (storedData) {
           historicalData[coin] = JSON.parse(storedData);
           // Update the chart with loaded historical data
           chartData.datasets[0].data.push(...historicalData[coin]);
       }
   }
}

function saveHistoricalData() {
   localStorage.setItem(symbol, JSON.stringify(historicalData[symbol]));
}

document.getElementById('coinSelector').addEventListener('change', function() {
   saveHistoricalData(); // Save current coin's historical data before switching

   symbol = this.value;   // Get selected symbol from dropdown
   loadHistoricalData();  // Load historical data for new symbol
   connectWebSocket();     // Reconnect with new symbol
});

document.getElementById('timeframeSelector').addEventListener('change', function() {
   previousInterval = interval; // Update previous interval before changing
   interval = this.value;       // Get selected interval from dropdown
   connectWebSocket();          // Reconnect with new interval
});

// Add CSS styles for chart visibility
document.addEventListener('DOMContentLoaded', () => {
   const chartContainer = document.getElementById('candlestickChart');
   chartContainer.style.display = 'block';
   chartContainer.style.width = '100%';
});

// Call this function when the page loads
createChart();
loadHistoricalData();          // Load initial historical data from local storage 
connectWebSocket();