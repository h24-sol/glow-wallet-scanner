const scanBtn = document.getElementById("scanBtn");
const walletInput = document.getElementById("wallet");
const resultSection = document.getElementById("result");
const exportBtn = document.getElementById("exportBtn");
const darkToggle = document.getElementById("darkToggle");
const searchInput = document.getElementById("searchInput");

const HELIUS_API_KEY = "c96a3c81-a711-4d05-8d98-19de7f38722b"; // your API
const COIN_API = "https://price.jup.ag/v4/price?ids=";

let allTokens = [];

scanBtn.addEventListener("click", scanWallet);
exportBtn.addEventListener("click", exportCSV);
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
searchInput.addEventListener("input", () => displayTokens(allTokens));

async function scanWallet() {
  const address = walletInput.value.trim();
  if (!address) return alert("Please enter a wallet address");

  resultSection.innerHTML = "🔄 Scanning...";

  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`);
    const data = await response.json();

    const tokens = data.tokens || [];
    const native = data.nativeBalance / 1e9;

    let html = `<p>💰 Native SOL Balance: ${native.toFixed(4)} SOL</p><ul>`;
    let totalUSD = 0;

    // Get prices for tokens
    const mints = tokens.map(t => t.mint).join(",");
    const priceRes = await fetch(`${COIN_API}${mints}`);
    const prices = await priceRes.json();

    allTokens = tokens.map(t => {
      const amount = t.amount / Math.pow(10, t.decimals || 0);
      const usd = prices.data?.[t.mint]?.price || 0;
      const isScam = amount > 10000 && usd < 0.00001;
      const isAirdrop = amount > 5000 && usd === 0;

      return {
        ...t,
        amount,
        usd,
        isScam,
        isAirdrop
      };
    });

    const filtered = allTokens.filter(matchSearch);
    filtered.forEach(t => {
      const line = `
        <li>
          ${t.isScam ? "⚠️ SCAM" : ""} ${t.isAirdrop ? "🎁 Airdrop" : ""}
          <br>- Token Mint: ${t.mint}
          <br>  Amount: ${t.amount.toFixed(4)}
          <br>  USD: ~$${(t.amount * t.usd).toFixed(4)}
        </li><br>
      `;
      html += line;
      totalUSD += t.amount * t.usd;
    });

    html += `</ul><p>💎 Estimated Total Wallet Worth: ~$${totalUSD.toFixed(2)} USD</p>`;
    html += getSummary(native, totalUSD, allTokens.length);
    resultSection.innerHTML = html;

    drawChart(allTokens);
  } catch (e) {
    resultSection.innerHTML = "❌ Error scanning wallet";
    console.error(e);
  }
}

function drawChart(tokens) {
  const ctx = document.getElementById("chart").getContext("2d");
  const labels = tokens.map(t => t.mint.slice(0, 4) + "..." + t.mint.slice(-4));
  const data = tokens.map(t => (t.amount * t.usd));

  if (window.pieChart) window.pieChart.destroy();
  window.pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        borderWidth: 1
      }]
    }
  });
}

function exportCSV() {
  if (!allTokens.length) return;

  const csv = [
    ["Mint", "Amount", "USD Value"]
  ];

  allTokens.forEach(t => {
    csv.push([t.mint, t.amount.toFixed(4), (t.amount * t.usd).toFixed(4)]);
  });

  const blob = new Blob([csv.map(r => r.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_data.csv";
  a.click();
}

function getSummary(sol, usd, tokenCount) {
  return `
    <p>🧠 AI Wallet Summary:</p>
    <ul>
      <li>📦 Token count: ${tokenCount}</li>
      <li>💸 USD Total: ~$${usd.toFixed(2)}</li>
      <li>🔐 SOL Balance: ${sol.toFixed(4)} SOL</li>
      <li>⚠️ Scam tokens: ${allTokens.filter(t => t.isScam).length}</li>
      <li>🎁 Airdrops: ${allTokens.filter(t => t.isAirdrop).length}</li>
    </ul>
  `;
}

function matchSearch(token) {
  const q = searchInput.value.toLowerCase();
  return token.mint.toLowerCase().includes(q);
}

function displayTokens(tokens) {
  scanWallet();
}
