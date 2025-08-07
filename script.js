const HELIUS_API_KEY = "a301848c-a27a-4b00-a2b1-7e0afab088a2";

// Map Solana token mint addresses to CoinGecko IDs for price fetching
const mintToCoingecko = {
  "So11111111111111111111111111111111111111112": "solana",
  "Es9vMFrzaCERWLzWfpHoUFR6Jxgxewqksx5FiNfAuVQ": "usd-coin",
  "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E": "bitcoin",
  // Add more token mappings if needed
};

const statusDiv = document.getElementById("status");
const resultsDiv = document.getElementById("results");
const walletInput = document.getElementById("walletInput");
const scanBtn = document.getElementById("scanBtn");

let solPriceChart = null;
let assetPieChart = null;

async function fetchHeliusAssets(walletAddress) {
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${HELIUS_API_KEY}`;
  const response = await fetch(url);
  if(!response.ok) throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
  return await response.json();
}

async function fetchWalletInfo(walletAddress) {
  // Get first transaction to estimate creation date
  const txUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?limit=1&api-key=${HELIUS_API_KEY}`;
  const response = await fetch(txUrl);
  if(!response.ok) throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
  const txs = await response.json();
  if(txs.length === 0) return { creationDate: "N/A", totalTransactions: 0 };
  const creationDate = new Date(txs[0].timestamp * 1000).toLocaleDateString();
  // Total tx count not easily fetched via Helius, so we show fetched count
  return { creationDate, totalTransactions: "Unknown" };
}

async function fetchRecentTransactions(walletAddress) {
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?limit=10&api-key=${HELIUS_API_KEY}`;
  const response = await fetch(url);
  if(!response.ok) throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
  return await response.json();
}

async function fetchSolPriceHistory() {
  const url = 'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1&interval=hourly';
  const response = await fetch(url);
  const data = await response.json();
  return data.prices; // [ [timestamp, price], ... ]
}

async function fetchTokenPrice(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const response = await fetch(url);
  const data = await response.json();
  return data[id]?.usd || 0;
}

function randomColor() {
  const baseHue = 174;
  const hue = baseHue + (Math.random() * 40 - 20);
  const saturation = 80 + Math.random() * 20;
  const lightness = 60 + Math.random() * 20;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

async function drawSolPriceChart() {
  const ctx = document.getElementById('solPriceChart').getContext('2d');
  const prices = await fetchSolPriceHistory();

  const labels = prices.map(p => new Date(p[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
  const data = prices.map(p => p[1]);

  if(solPriceChart) solPriceChart.destroy();

  solPriceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'SOL Price (USD)',
        data,
        borderColor: '#00ffd5',
        backgroundColor: 'rgba(0, 255, 213, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { ticks: { color: '#00ffd5' }, grid: { color: '#00ffd533' } },
        x: { ticks: { color: '#00ffd5' }, grid: { color: '#00ffd533' } }
      },
      plugins: { legend: { labels: { color: '#00ffd5' } } }
    }
  });
}

function drawAssetPieChart(labels, values, colors) {
  const ctx = document.getElementById('assetPieChart').getContext('2d');
  if(assetPieChart) assetPieChart.destroy();

  assetPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#203a43',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#00ffd5' } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: $${ctx.raw.toFixed(2)}`
          }
        }
      }
    }
  });
}

function createTokenTable(assets, totalValue, walletInfo, recentTxs) {
  let html = `
    <h2>Wallet Overview</h2>
    <p><b>Wallet Creation Date:</b> ${walletInfo.creationDate} &nbsp;&nbsp; <b>Total Transactions (approx):</b> ${walletInfo.totalTransactions}</p>
    <p><b>Total Wallet Value:</b> $${totalValue.toFixed(2)}</p>
    <h3>Token Balances</h3>
    <table>
      <thead>
        <tr><th>Token</th><th>Amount</th><th>USD Value</th></tr>
      </thead>
      <tbody>
  `;
  for(const asset of assets) {
    html += `<tr>
      <td>${asset.symbol || asset.mint}</td>
      <td>${asset.amount.toLocaleString(undefined, {maximumFractionDigits: 4})}</td>
      <td>$${asset.usdValue.toFixed(2)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  // Recent Transactions
  html += `<h3>Recent Transactions (up to 10)</h3>`;
  if(recentTxs.length === 0) {
    html += `<p>No recent transactions found.</p>`;
  } else {
    html += `<table>
      <thead><tr><th>Signature</th><th>Date & Time</th></tr></thead><tbody>`;
    for(const tx of recentTxs) {
      html += `<tr>
        <td><a href="https://explorer.solana.com/tx/${tx.signature}" target="_blank" rel="noopener noreferrer">${tx.signature.slice(0, 10)}...</a></td>
        <td>${new Date(tx.timestamp * 1000).toLocaleString()}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }

  return html;
}

async function scanWallet() {
  const walletAddress = walletInput.value.trim();
  if(!walletAddress) {
    statusDiv.textContent = "Please enter a valid Solana wallet address.";
    return;
  }

  statusDiv.textContent = "Fetching wallet data...";
  resultsDiv.innerHTML = "";
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning...";

  try {
    const [assetsRaw, walletInfo, recentTxs] = await Promise.all([
      fetchHeliusAssets(walletAddress),
      fetchWalletInfo(walletAddress),
      fetchRecentTransactions(walletAddress)
    ]);

    // Process assets with prices
    let totalValue = 0;
    const assets = [];

    for(const asset of assetsRaw) {
      const amountRaw = Number(asset.amount || 0);
      const decimals = asset.decimals || 0;
      const amount = amountRaw / (10 ** decimals);

      let price = 0;
      const coingeckoId = mintToCoingecko[asset.mint];
      if(coingeckoId) {
        price = await fetchTokenPrice(coingeckoId);
      }
      const usdValue = amount * price;
      totalValue += usdValue;

      assets.push({
        mint: asset.mint,
        symbol: asset.symbol || asset.mint.slice(0, 6),
        amount,
        usdValue
      });
    }

    // Sort assets by USD value descending
    assets.sort((a, b) => b.usdValue - a.usdValue);

    // Prepare pie chart data
    const pieLabels = assets.map(a => a.symbol);
    const pieValues = assets.map(a => a.usdValue);
    const pieColors = assets.map(() => randomColor());

    drawAssetPieChart(pieLabels, pieValues, pieColors);
    await drawSolPriceChart();

    resultsDiv.innerHTML = createTokenTable(assets, totalValue, walletInfo, recentTxs);

    statusDiv.textContent = "Scan complete!";

  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    resultsDiv.innerHTML = "";
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Wallet";
  }
}

// Event listener for button click
scanBtn.addEventListener("click", scanWallet);

// Draw initial SOL price chart on page load
drawSolPriceChart();
