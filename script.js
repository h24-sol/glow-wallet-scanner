const API_KEY = "c96a3c81-a711-4d05-8d98-19de7f38722b";
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
const HELIUS_API = `https://api.helius.xyz/v0`;
let currentTokens = [];

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Please enter a wallet address");

  document.getElementById("nativeBalance").innerText = "💰 Native SOL Balance: Loading...";
  document.getElementById("totalWorth").innerText = "💎 Estimated Total Wallet Worth: Loading...";
  document.getElementById("aiSummary").innerText = "AI summary loading...";
  document.getElementById("tokenList").innerHTML = "Loading...";

  try {
    const res = await fetch(HELIUS_API + `/addresses/${address}/balances?api-key=${API_KEY}`);
    const data = await res.json();
    const tokens = data.tokens || [];
    const sol = data.nativeBalance || 0;
    currentTokens = tokens;

    const solBalance = sol / 1e9;
    const solPrice = await fetchSOLPrice();
    const solValueUSD = solBalance * solPrice;

    document.getElementById("nativeBalance").innerText = `💰 Native SOL Balance: ${solBalance.toFixed(4)} SOL ($${solValueUSD.toFixed(2)})`;

    const tokenList = document.getElementById("tokenList");
    tokenList.innerHTML = "";

    let totalValue = solValueUSD;
    let portfolio = [];

    for (const token of tokens) {
      const amount = token.amount / Math.pow(10, token.decimals || 0);
      const listItem = document.createElement("li");

      listItem.innerHTML = `
        <strong>Mint:</strong> ${token.mint}<br>
        <strong>Amount:</strong> ${amount.toFixed(4)}
      `;
      tokenList.appendChild(listItem);

      portfolio.push({ label: token.mint.slice(0, 4) + "...", value: amount });
    }

    document.getElementById("totalWorth").innerText = `💎 Estimated Total Wallet Worth: ~$${totalValue.toFixed(2)} USD`;

    drawPortfolioChart(portfolio);
    drawSOLChart();
    generateAISummary(solBalance, tokens.length, totalValue);
  } catch (e) {
    console.error(e);
    document.getElementById("nativeBalance").innerText = "❌ Failed to fetch wallet data.";
    document.getElementById("totalWorth").innerText = "";
    document.getElementById("tokenList").innerHTML = "";
  }
}

async function fetchSOLPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await res.json();
    return data.solana.usd || 0;
  } catch {
    return 0;
  }
}

function exportToCSV() {
  if (!currentTokens.length) return alert("No token data to export.");
  let csv = "Mint,Amount\n";
  currentTokens.forEach(t => {
    const amount = t.amount / Math.pow(10, t.decimals || 0);
    csv += `${t.mint},${amount}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "solana_wallet.csv";
  a.click();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function filterTokens() {
  const query = document.getElementById("tokenSearch").value.toLowerCase();
  const filtered = currentTokens.filter(t => t.mint.toLowerCase().includes(query));
  const tokenList = document.getElementById("tokenList");
  tokenList.innerHTML = "";
  filtered.forEach(token => {
    const amount = token.amount / Math.pow(10, token.decimals || 0);
    const listItem = document.createElement("li");
    listItem.innerHTML = `
      <strong>Mint:</strong> ${token.mint}<br>
      <strong>Amount:</strong> ${amount.toFixed(4)}
    `;
    tokenList.appendChild(listItem);
  });
}

function drawPortfolioChart(data) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  if (window.portfolioChartInstance) window.portfolioChartInstance.destroy();
  window.portfolioChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function drawSOLChart() {
  const ctx = document.getElementById("solPriceChart").getContext("2d");
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7");
    const data = await res.json();
    const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());
    const prices = data.prices.map(p => p[1]);
    if (window.solChartInstance) window.solChartInstance.destroy();
    window.solChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "SOL Price (USD)",
          data: prices,
          fill: true,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: false }
        }
      }
    });
  } catch (e) {
    console.error("SOL chart error", e);
  }
}

function generateAISummary(solBalance, tokenCount, totalValue) {
  let summary = `This wallet holds approximately ${solBalance.toFixed(2)} SOL and ${tokenCount} tokens, with a total estimated value of $${totalValue.toFixed(2)}.`;
  if (totalValue === 0) {
    summary += " It appears to be a new or inactive wallet.";
  } else if (totalValue < 10) {
    summary += " It is a light user with small holdings.";
  } else {
    summary += " It appears to be moderately active on the Solana network.";
  }
  document.getElementById("aiSummary").innerText = summary;
}
