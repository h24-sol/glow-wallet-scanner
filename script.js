const API_KEY = "REPLACE_WITH_YOUR_HELIUS_API_KEY";
const SOL_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

let solPrice = 0;
let tokensGlobal = [];

async function fetchSolPrice() {
  const res = await fetch(SOL_PRICE_API);
  const data = await res.json();
  solPrice = data.solana.usd;
  return solPrice;
}

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Enter wallet address");

  document.getElementById("walletAddress").innerText = address;

  try {
    await fetchSolPrice();

    const url = `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const sol = (data.nativeBalance || 0) / 1e9;
    const solUSD = (sol * solPrice).toFixed(2);
    document.getElementById("solBalance").innerText = `💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${solUSD})`;

    tokensGlobal = (data.tokens || []).map(t => ({
      mint: t.mint,
      amount: t.amount / 10 ** t.decimals,
    }));

    showTokens(tokensGlobal);
    showPortfolio(tokensGlobal);
    generateSummary(tokensGlobal, sol, solUSD);
    drawSOLChart();

    const totalValue = parseFloat(solUSD); // Token value skipped, no oracle data
    document.getElementById("totalValue").innerText = `💎 Estimated Total Wallet Worth: ~$${totalValue.toFixed(2)} USD`;

  } catch (err) {
    console.error(err);
    document.getElementById("tokenList").innerHTML = `<p>❌ Failed to fetch wallet data.</p>`;
  }
}

function showTokens(tokens) {
  const container = document.getElementById("tokenList");
  container.innerHTML = "🔹 Tokens:<br>";
  tokens.forEach(t => {
    container.innerHTML += `<div class="token">
      <strong>Mint:</strong> ${t.mint}<br/>
      <strong>Amount:</strong> ${t.amount.toFixed(4)}
    </div>`;
  });
}

function filterTokens() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const filtered = tokensGlobal.filter(t => t.mint.toLowerCase().includes(keyword));
  showTokens(filtered);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

function exportCSV() {
  let csv = "Mint,Amount\n";
  tokensGlobal.forEach(t => {
    csv += `${t.mint},${t.amount}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_tokens.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function showPortfolio(tokens) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  const labels = tokens.map(t => t.mint.slice(0, 4) + "..." + t.mint.slice(-4));
  const data = tokens.map(t => t.amount);

  new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`)
      }]
    }
  });
}

async function drawSOLChart() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1");
  const data = await res.json();
  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map(p => new Date(p[0]).toLocaleTimeString());

  const ctx = document.getElementById("solPriceChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "SOL Price (USD)",
        data: prices,
        borderWidth: 2
      }]
    }
  });
}

function generateSummary(tokens, sol, usd) {
  const count = tokens.length;
  const summary = `This wallet holds approximately ${sol.toFixed(2)} SOL and ${count} tokens, with a total estimated value of $${usd}. ${
    count === 0 ? "It appears to be a light user on the Solana network." : "It is an active wallet."
  }`;
  document.getElementById("walletSummary").innerText = summary;
}
