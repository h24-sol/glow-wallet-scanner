const apiKey = 'a2fb8074-3461-480a-a202-159d980fd02a';
const baseURL = `https://api.helius.xyz/v0/addresses`;
const solanaPriceAPI = `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`;

document.getElementById("scanBtn").addEventListener("click", scanWallet);
document.getElementById("darkModeBtn").addEventListener("click", toggleDarkMode);
document.getElementById("exportBtn").addEventListener("click", exportCSV);
document.getElementById("tokenSearch").addEventListener("input", filterTokens);

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = "";

  if (!address) {
    errorMessage.textContent = "⚠️ Please enter a wallet address.";
    return;
  }

  try {
    const tokenRes = await fetch(`${baseURL}/${address}/balances?api-key=${apiKey}`);
    const tokenData = await tokenRes.json();

    if (!tokenData.tokens) {
      throw new Error("Invalid response structure");
    }

    const solRes = await fetch(solanaPriceAPI);
    const solData = await solRes.json();
    const solPrice = solData.solana?.usd || 0;

    displayTokens(tokenData.tokens, solPrice);
    updateCharts(tokenData.tokens, solPrice);
  } catch (err) {
    errorMessage.textContent = `❌ Failed to load data`;
    console.error(err);
  }
}

function displayTokens(tokens, solPrice) {
  const list = document.getElementById("tokenList");
  list.innerHTML = "";

  const filtered = tokens.filter(t => t.amount > 0 && t.mint);
  let totalUSD = 0;

  const tokenElements = filtered.map(token => {
    const amount = token.amount / Math.pow(10, token.decimals || 0);
    const valueUSD = token.price ? (amount * token.price) : 0;
    totalUSD += valueUSD;

    return {
      ...token,
      displayName: token.tokenName || token.tokenSymbol || token.mint.slice(0, 6),
      amount,
      valueUSD
    };
  });

  tokenElements.forEach(token => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${token.displayName}</span>
      <span>${token.amount.toFixed(4)}</span>
      <span>$${token.valueUSD.toFixed(2)}</span>
    `;
    list.appendChild(li);
  });
}

function updateCharts(tokens, solPrice) {
  const chartData = tokens
    .filter(t => t.amount > 0)
    .map(t => {
      const amount = t.amount / Math.pow(10, t.decimals || 0);
      const usdValue = (t.price ?? 0) * amount;
      return {
        name: t.tokenName || t.tokenSymbol || t.mint.slice(0, 6),
        value: usdValue
      };
    })
    .filter(t => t.value > 0);

  const ctx = document.getElementById("portfolioChart").getContext("2d");
  if (window.portfolioChart) window.portfolioChart.destroy();

  window.portfolioChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.map(c => c.name),
      datasets: [{
        data: chartData.map(c => c.value),
        backgroundColor: chartData.map(() =>
          `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
        )
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: '📊 Portfolio Breakdown',
          font: { size: 18, weight: 'bold' }
        }
      }
    }
  });

  // SOL price chart (example)
  const solCtx = document.getElementById("solChart").getContext("2d");
  if (window.solChart) window.solChart.destroy();

  window.solChart = new Chart(solCtx, {
    type: 'bar',
    data: {
      labels: ['Current'],
      datasets: [{
        label: 'SOL/USD',
        data: [solPrice],
        backgroundColor: '#00cc99'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: '📉 SOL Price',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function filterTokens(e) {
  const query = e.target.value.toLowerCase();
  const items = document.querySelectorAll("#tokenList li");
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(query)
      ? ""
      : "none";
  });
}

function exportCSV() {
  const rows = [["Token", "Amount", "Value (USD)"]];
  document.querySelectorAll("#tokenList li").forEach(li => {
    const cols = li.querySelectorAll("span");
    const row = Array.from(cols).map(span => span.textContent);
    rows.push(row);
  });

  let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "wallet_tokens.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
