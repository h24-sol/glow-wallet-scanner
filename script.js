const heliusURL = 'https://mainnet.helius-rpc.com/?api-key=4e9c3cf0-79d3-4072-8fc5-6e8aa8d3a6e4';
let chartInstance = null;
let portfolioChart = null;

async function scanWallet() {
  const address = document.getElementById('walletInput').value;
  if (!address) return alert("Please enter a wallet address.");

  try {
    const res = await fetch(heliusURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccounts",
        params: { owner: address, displayOptions: { showUnverifiedCollections: true } }
      })
    });

    const data = await res.json();
    const tokens = data.result?.tokens || [];
    const sol = data.result?.nativeBalance?.lamports || 0;
    const solBalance = sol / 1e9;

    document.getElementById('nativeBalance').textContent = `💰 Native SOL Balance: ${solBalance.toFixed(4)} SOL`;

    const solPrice = await fetchSOLPrice();
    const solUSD = solBalance * solPrice;
    let total = solUSD;

    const tokenList = document.getElementById('tokenList');
    tokenList.innerHTML = '';
    const pieLabels = [];
    const pieData = [];

    tokens.forEach(token => {
      const mint = token.mint;
      const amount = token.amount / Math.pow(10, token.decimals || 0);
      const li = document.createElement('li');
      li.textContent = `Mint: ${mint}\nAmount: ${amount.toFixed(4)}`;
      li.classList.add('token-item');
      tokenList.appendChild(li);

      pieLabels.push(mint.slice(0, 4) + "..." + mint.slice(-4));
      pieData.push(amount);
    });

    document.getElementById('totalValue').textContent = `💎 Estimated Total Wallet Worth: ~$${total.toFixed(2)} USD`;
    document.getElementById('walletSummary').textContent =
      `This wallet holds approximately ${solBalance.toFixed(2)} SOL and ${tokens.length} tokens, with a total estimated value of $${total.toFixed(2)}.`;

    renderPieChart(pieLabels, pieData);
  } catch (err) {
    document.getElementById('nativeBalance').textContent = "💰 Native SOL Balance: N/A";
    document.getElementById('totalValue').textContent = "💎 Estimated Total Wallet Worth: ~N/A USD";
    document.getElementById('walletSummary').textContent = "❌ Failed to fetch wallet data.";
  }
}

async function fetchSOLPrice() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await response.json();
  return data.solana.usd;
}

function exportCSV() {
  const rows = [["Token Mint", "Amount"]];
  document.querySelectorAll('#tokenList li').forEach(li => {
    const [mint, amount] = li.textContent.replace("Mint: ", "").split("\nAmount: ");
    rows.push([mint, amount]);
  });

  let csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "wallet_tokens.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function filterTokens() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const items = document.querySelectorAll("#tokenList li");
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(input) ? "" : "none";
  });
}

async function renderSOLPriceChart() {
  const response = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7');
  const chartData = await response.json();
  const prices = chartData.prices.map(p => p[1]);
  const labels = chartData.prices.map(p => {
    const date = new Date(p[0]);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const ctx = document.getElementById('priceChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'SOL Price (USD)',
        data: prices,
        fill: true,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true
    }
  });
}

function renderPieChart(labels, data) {
  const ctx = document.getElementById('portfolioChart').getContext('2d');
  if (portfolioChart) portfolioChart.destroy();
  portfolioChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data
      }]
    }
  });
}

// Load chart on first visit
window.onload = renderSOLPriceChart;
