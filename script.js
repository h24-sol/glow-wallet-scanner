const HELIUS_API_KEY = "c96a3c81-a711-4d05-8d98-19de7f38722b";
const scanBtn = document.getElementById("scan-btn");
const resultSection = document.getElementById("result");
const walletInput = document.getElementById("wallet-input");
const toggleDark = document.getElementById("toggle-dark");
const exportBtn = document.getElementById("export-btn");
const tokenSearch = document.getElementById("token-search");

let tokensGlobal = [];

toggleDark.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

scanBtn.addEventListener("click", async () => {
  const address = walletInput.value.trim();
  if (!address) {
    alert("Please enter a wallet address.");
    return;
  }

  resultSection.innerHTML = "⏳ Scanning wallet...";
  try {
    const res = await fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`);
    const data = await res.json();

    const tokens = data.tokens || [];
    const nativeBalanceLamports = data.nativeBalance || 0;
    const sol = nativeBalanceLamports / 1e9;

    tokensGlobal = tokens.map(token => ({
      mint: token.mint,
      amount: token.amount / Math.pow(10, token.decimals || 0)
    }));

    const solPrice = await fetchSolPrice();
    const totalUsd = sol * solPrice;

    let html = `💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${(sol * solPrice).toFixed(2)})<br><br>`;
    html += `🔹 Tokens:<br>`;

    tokensGlobal.forEach((t, i) => {
      html += `- Token Mint: ${t.mint}<br>`;
      html += `  Amount: ${t.amount.toFixed(4)}<br><br>`;
    });

    html += `💎 Estimated Total Wallet Worth: ~$${totalUsd.toFixed(2)} USD<br>`;

    resultSection.innerHTML = html;
    drawChart(tokensGlobal);

  } catch (err) {
    console.error("Fetch failed:", err);
    resultSection.innerHTML = "❌ Failed to fetch wallet data. Check API key or try again.";
  }
});

async function fetchSolPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await res.json();
    return data.solana.usd || 0;
  } catch {
    return 0;
  }
}

exportBtn.addEventListener("click", () => {
  if (tokensGlobal.length === 0) {
    alert("No tokens to export.");
    return;
  }

  const rows = [
    ["Token Mint", "Amount"],
    ...tokensGlobal.map(t => [t.mint, t.amount.toFixed(4)])
  ];

  const csv = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_tokens.csv";
  a.click();
});

tokenSearch.addEventListener("input", () => {
  const q = tokenSearch.value.toLowerCase();
  const filtered = tokensGlobal.filter(t => t.mint.toLowerCase().includes(q));
  resultSection.innerHTML = `🔹 Tokens:<br>`;
  filtered.forEach(t => {
    resultSection.innerHTML += `- Token Mint: ${t.mint}<br>Amount: ${t.amount.toFixed(4)}<br><br>`;
  });
});

function drawChart(data) {
  const ctx = document.getElementById("token-chart").getContext("2d");
  if (window.tokenChart) window.tokenChart.destroy();

  window.tokenChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: data.map(t => t.mint.slice(0, 4) + "..." + t.mint.slice(-4)),
      datasets: [{
        data: data.map(t => t.amount),
        backgroundColor: data.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`)
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "bottom"
        }
      }
    }
  });
}
