const API_KEY = "c96a3c81-a711-4d05-8d98-19de7f38722b";
const API_URL = "https://api.helius.xyz/v0/addresses";
const walletInput = document.getElementById("wallet");
const resultDiv = document.getElementById("result");
const scanButton = document.getElementById("scanBtn");
const exportBtn = document.getElementById("exportBtn");
const chartCanvas = document.getElementById("chart");
const searchInput = document.getElementById("searchInput");
const darkToggle = document.getElementById("darkToggle");

let fullTokenList = [];

scanButton.addEventListener("click", async () => {
  const address = walletInput.value.trim();
  if (!address) return alert("Please enter a wallet address.");

  resultDiv.innerHTML = "🔄 Scanning wallet...";
  fullTokenList = [];

  try {
    const res = await fetch(`${API_URL}/${address}/balances?api-key=${API_KEY}`);
    const data = await res.json();

    if (!data) throw new Error("Invalid response");

    const tokens = data.tokens.filter(t => t.amount > 0);
    const sol = (data.nativeBalance || 0) / 1e9;

    const enriched = await enrichTokens(tokens);
    fullTokenList = enriched;

    const totalUsd = enriched.reduce((sum, t) => sum + t.usdValue, sol * getSolPrice());

    resultDiv.innerHTML = `
      💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${(sol * getSolPrice()).toFixed(2)})
      <br><br>
      🔹 Tokens:<br>
      ${renderTokens(enriched)}
      <br>💎 Estimated Total Wallet Worth: ~$${totalUsd.toFixed(2)} USD
      <br><br>🧠 AI Summary: ${generateSummary(enriched, sol)}
    `;

    renderChart(enriched, sol);
  } catch (e) {
    console.error(e);
    resultDiv.innerHTML = "❌ Failed to fetch wallet data.";
  }
});

function getSolPrice() {
  return 160; // Static for now. You can fetch live price from CoinGecko API
}

function renderTokens(tokens) {
  return tokens.map(t => `
    - <strong>${t.symbol || "Unknown"}</strong> (${t.mint.slice(0, 4)}...${t.mint.slice(-4)})<br>
      Amount: ${(t.amount / Math.pow(10, t.decimals)).toFixed(4)} ~ $${t.usdValue.toFixed(2)} ${t.scam ? "🚨 SCAM?" : ""}
  `).join("<br><br>");
}

async function enrichTokens(tokens) {
  return tokens.map(t => {
    const amount = t.amount / Math.pow(10, t.decimals);
    const usd = estimatePrice(t.mint) * amount;
    const scam = detectScam(t);
    const symbol = getSymbol(t.mint);
    return { ...t, usdValue: usd, scam, symbol };
  });
}

function estimatePrice(mint) {
  const known = {
    "So11111111111111111111111111111111111111112": 160 // wrapped SOL
    // Add more mints if needed
  };
  return known[mint] || 0.000001; // default guess
}

function detectScam(t) {
  return (
    t.amount > 1_000_000_000 &&
    t.decimals === 0
  );
}

function generateSummary(tokens, sol) {
  const tokenCount = tokens.length;
  const scams = tokens.filter(t => t.scam).length;
  const highValue = tokens.filter(t => t.usdValue > 10).length;

  if (sol === 0 && tokenCount === 0) return "Empty wallet.";
  if (scams > 0) return "Caution: Possible airdrop scams found.";
  if (highValue > 3) return "This wallet holds multiple high-value tokens.";
  return "Normal wallet with low to medium activity.";
}

function renderChart(tokens, sol) {
  const labels = tokens.map(t => t.symbol || "Unknown");
  const data = tokens.map(t => t.usdValue);

  if (sol > 0) {
    labels.push("SOL");
    data.push(sol * getSolPrice());
  }

  new Chart(chartCanvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data
      }]
    }
  });
}

exportBtn.addEventListener("click", () => {
  const csv = fullTokenList.map(t =>
    `${t.symbol || "Unknown"},${t.amount},${t.usdValue.toFixed(2)},${t.mint},${t.scam ? "Yes" : "No"}`
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "wallet_export.csv";
  link.click();
});

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase();
  const filtered = fullTokenList.filter(t =>
    (t.symbol || "").toLowerCase().includes(keyword)
  );
  resultDiv.innerHTML = renderTokens(filtered);
});

darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

