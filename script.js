const HELIUS_API_KEY = "a2fb8074-3461-480a-a202-159d980fd02a";
const SOL_PRICE_API = "https://price.jup.ag/v4/price?ids=SOL";

async function scanWallet() {
  const wallet = document.getElementById("walletInput").value.trim();
  if (!wallet) return showError("Please enter a wallet address");

  clearUI();
  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${wallet}/tokens?api-key=${HELIUS_API_KEY}`);
    const data = await response.json();
    if (!data.tokens) return showError("❌ Failed to load data");

    const sol = data.nativeBalance / 1e9;
    const tokens = data.tokens.filter(t => t.amount > 0);
    const solPrice = await getSolPrice();
    const tokenListEl = document.getElementById("tokenList");

    const portfolio = tokens.map(t => {
      const amount = t.amount / Math.pow(10, t.decimals);
      return {
        ...t,
        displayAmount: amount,
        displayValue: amount * solPrice
      };
    });

    let totalValue = sol * solPrice + portfolio.reduce((sum, t) => sum + t.displayValue, 0);

    portfolio.forEach(t => {
      const li = document.createElement("li");
      const percent = ((t.displayValue / totalValue) * 100).toFixed(2);
      li.textContent = `${t.mint.slice(0, 4)}...${t.mint.slice(-4)} - $${t.displayValue.toFixed(2)} (${percent}%)`;
      tokenListEl.appendChild(li);
    });

    if (sol > 0) {
      const li = document.createElement("li");
      const solValue = sol * solPrice;
      const percent = ((solValue / totalValue) * 100).toFixed(2);
      li.textContent = `SOL - $${solValue.toFixed(2)} (${percent}%)`;
      tokenListEl.insertBefore(li, tokenListEl.firstChild);
    }

    drawPortfolioChart(portfolio, sol * solPrice);
    drawSolChart();
  } catch (err) {
    showError("❌ Failed to fetch wallet data");
  }
}

function showError(msg) {
  document.getElementById("errorMessage").textContent = msg;
}

function clearUI() {
  document.getElementById("tokenList").innerHTML = "";
  document.getElementById("errorMessage").textContent = "";
}

function filterTokens() {
  const filter = document.getElementById("searchInput").value.toLowerCase();
  const list = document.getElementById("tokenList").getElementsByTagName("li");
  for (let item of list) {
    const txt = item.textContent.toLowerCase();
    item.style.display = txt.includes(filter) ? "" : "none";
  }
}

function exportCSV() {
  const rows = [["Token", "Value (USD)"]];
  document.querySelectorAll("#tokenList li").forEach(li => {
    const parts = li.textContent.split(" - ");
    if (parts.length === 2) rows.push([parts[0], parts[1]]);
  });

  let csv = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_data.csv";
  a.click();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

async function getSolPrice() {
  const res = await fetch(SOL_PRICE_API);
  const json = await res.json();
  return json.data.SOL.price || 0;
}

async function drawSolChart() {
  try {
    const res = await fetch("https://price.jup.ag/v1/price-history?id=SOL&span=24h");
    const { data } = await res.json();
    const labels = data.map(p => new Date(p.timestamp * 1000).toLocaleTimeString());
    const prices = data.map(p => p.price);

    new Chart(document.getElementById("solChart"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "SOL Price (24h)",
          data: prices,
          fill: false,
          borderColor: "#00cc99",
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });
  } catch {
    showError("❌ Failed to load SOL price chart");
  }
}

function drawPortfolioChart(tokens, solUSD) {
  const labels = ["SOL", ...tokens.map(t => t.mint.slice(0, 4) + "..." + t.mint.slice(-4))];
  const values = [solUSD, ...tokens.map(t => t.displayValue)];

  new Chart(document.getElementById("portfolioChart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}
