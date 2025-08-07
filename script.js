const API_KEY = 'a301848c-a27a-4b00-a2b1-7e0afab088a2';
const BASE_URL = 'https://api.helius.xyz/v0';
const scanButton = document.getElementById('scanButton');
const walletInfo = document.getElementById('walletInfo');
let solChart, pieChart;

scanButton.addEventListener('click', async () => {
  const address = document.getElementById('walletAddress').value.trim();
  if (!address) return alert('Please enter a wallet address.');

  walletInfo.innerHTML = '🔄 Scanning...';
  walletInfo.classList.remove('hidden');

  try {
    const balances = await fetch(`${BASE_URL}/addresses/${address}/balances?api-key=${API_KEY}`);
    const balanceData = await balances.json();

    let totalUSD = 0;
    const tokenList = balanceData.tokens.map(token => {
      totalUSD += token.amount.usd || 0;
      return `${token.tokenAccount.tokenName || 'Unknown'}: $${(token.amount.usd || 0).toFixed(2)}`;
    });

    walletInfo.innerHTML = `
      <h3>Wallet Summary</h3>
      <p><strong>Total Asset Value:</strong> $${totalUSD.toFixed(2)}</p>
      <p><strong>Tokens:</strong><br>${tokenList.join('<br>')}</p>
    `;

    updatePieChart(balanceData.tokens);
  } catch (error) {
    walletInfo.innerHTML = '❌ Error: ' + error.message;
  }
});

function updatePieChart(tokens) {
  const labels = tokens.map(t => t.tokenAccount.tokenName || 'Unknown');
  const values = tokens.map(t => t.amount.usd || 0);

  if (pieChart) pieChart.destroy();
  const ctx = document.getElementById('tokenPieChart').getContext('2d');
  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Token Distribution (USD)',
        data: values
      }]
    }
  });
}

async function drawSolPriceChart() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1');
    const data = await res.json();
    const labels = data.prices.map(p => new Date(p[0]).toLocaleTimeString());
    const prices = data.prices.map(p => p[1]);

    const ctx = document.getElementById('solPriceChart').getContext('2d');
    solChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'SOL Price (24h)',
          data: prices,
          borderWidth: 2,
          tension: 0.4
        }]
      }
    });
  } catch (error) {
    console.error('Chart error:', error);
  }
}

drawSolPriceChart();
