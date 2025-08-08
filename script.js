
const API_KEY = 'a301848c-a27a-4b00-a2b1-7e0afab088a2';

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = "";

  if (!address) {
    errorDiv.textContent = "❌ Please enter a wallet address.";
    return;
  }

  try {
    // Wallet creation date mock
    document.getElementById("creationDate").textContent = new Date().toLocaleString();

    // Fetch balances
    const balanceRes = await fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${API_KEY}`);
    const balanceData = await balanceRes.json();

    const totalVol = balanceData.nativeBalance / 1e9 + " SOL";
    document.getElementById("totalVolume").textContent = totalVol;

    const burnedCount = balanceData.tokens.filter(t => t.amount === "0").length;
    document.getElementById("burnedTokens").textContent = burnedCount;

    document.getElementById("smartWallet").textContent = totalVol > 10 ? "✅ Yes" : "❌ No";

    document.getElementById("aiSummary").textContent = "This wallet shows average activity with some potential.";

    drawPieChart(balanceData.tokens);
    drawSOLChart();

  } catch (err) {
    console.error(err);
    errorDiv.textContent = "❌ Error fetching data. Please try again.";
  }
}

function drawPieChart(tokens) {
  const canvas = document.getElementById("tokenPieChart");
  const ctx = canvas.getContext("2d");
  const topTokens = tokens.slice(0, 5);

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: topTokens.map(t => t.mint.slice(0, 4) + "..."),
      datasets: [{
        data: topTokens.map(t => parseFloat(t.amount)),
        backgroundColor: ['#39ff14', '#14bfff', '#ff7f50', '#ff1493', '#ffa500']
      }]
    }
  });
}

function drawSOLChart() {
  const canvas = document.getElementById("solPriceChart");
  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1m', '2m', '3m', '4m', '5m'],
      datasets: [{
        label: 'SOL Price (Mock)',
        data: [23, 24, 23.5, 24.2, 25],
        borderColor: '#39ff14',
        fill: false,
        tension: 0.1
      }]
    }
  });
}
