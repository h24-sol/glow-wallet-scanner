const HELIUS_API_KEY = "a2fb8074-3461-480a-a202-159d980fd02a";
const SOLANA_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Please enter a wallet address");

  document.getElementById("nativeBalance").innerText = "💰 Native SOL Balance: Loading...";
  document.getElementById("totalWorth").innerText = "💎 Estimated Total Wallet Worth: Loading...";
  document.getElementById("tokenList").innerHTML = "";
  document.getElementById("aiSummary").innerText = "AI summary loading...";

  try {
    const res = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner", params: [address, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }] }])
    });

    const data = await res.json();
    const tokenAccounts = data[0]?.result?.value || [];

    let totalUSD = 0;
    let tokenData = [];

    for (const account of tokenAccounts) {
      const info = account.account.data.parsed.info;
      const mint = info.mint;
      const amount = parseFloat(info.tokenAmount.uiAmountString || "0");

      const tokenInfoRes = await fetch(`https://token.jup.ag/info`);
      const tokenInfoData = await tokenInfoRes.json();
      const tokenMeta = tokenInfoData?.[mint];

      const symbol = tokenMeta?.symbol || "Unknown";
      const decimals = tokenMeta?.decimals || 0;
      const price = tokenMeta?.price || 0;

      const usdValue = price * amount;
      totalUSD += usdValue;

      tokenData.push({ mint, symbol, amount, usdValue });
    }

    const nativeRes = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ jsonrpc: "2.0", id: 2, method: "getBalance", params: [address] }])
    });

    const nativeData = await nativeRes.json();
    const lamports = nativeData[0]?.result?.value || 0;
    const sol = lamports / 1e9;

    const solPriceRes = await fetch("https://price.jup.ag/v4/price?ids=SOL");
    const solPriceData = await solPriceRes.json();
    const solUSD = sol * (solPriceData?.data?.SOL?.price || 0);

    totalUSD += solUSD;

    document.getElementById("nativeBalance").innerText = `💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${solUSD.toFixed(2)})`;
    document.getElementById("totalWorth").innerText = `💎 Estimated Total Wallet Worth: ~$${totalUSD.toFixed(2)} USD`;

    const tokenList = document.getElementById("tokenList");
    tokenData.forEach(token => {
      const li = document.createElement("li");
      li.innerText = `Token: ${token.symbol}\nAmount: ${token.amount.toFixed(4)}\nValue: $${token.usdValue.toFixed(2)}`;
      tokenList.appendChild(li);
    });

    drawPortfolioChart(tokenData);
    drawSolPriceChart();
    generateAISummary(sol, tokenData.length, totalUSD);
  } catch (err) {
    console.error(err);
    document.getElementById("nativeBalance").innerText = "❌ Failed to load data";
    document.getElementById("totalWorth").innerText = "❌ Failed to calculate wallet value";
  }
}

function drawPortfolioChart(tokenData) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  const labels = tokenData.map(t => t.symbol);
  const values = tokenData.map(t => t.usdValue);
  const total = values.reduce((a, b) => a + b, 0);
  const percentages = values.map(v => ((v / total) * 100).toFixed(1));

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.map((l, i) => `${l} (${percentages[i]}%)`),
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => `hsl(${i * 45}, 80%, 60%)`)
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

async function drawSolPriceChart() {
  const ctx = document.getElementById("solPriceChart").getContext("2d");

  const res = await fetch("https://price.jup.ag/historical/price?ids=SOL&interval=1h");
  const data = await res.json();
  const prices = data?.data?.SOL?.prices || [];

  new Chart(ctx, {
    type: "line",
    data: {
      labels: prices.map(p => new Date(p.timestamp).toLocaleTimeString()),
      datasets: [{
        label: "SOL Price (USD)",
        data: prices.map(p => p.price),
        borderColor: "#00ffa3",
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { display: false },
        y: { beginAtZero: false }
      }
    }
  });
}

function generateAISummary(sol, tokenCount, totalUSD) {
  const summary = `This wallet holds approximately ${sol.toFixed(2)} SOL and ${tokenCount} tokens, with a total estimated value of $${totalUSD.toFixed(2)}.`;
  document.getElementById("aiSummary").innerText = summary;
}

function filterTokens() {
  const query = document.getElementById("tokenSearch").value.toLowerCase();
  const tokens = document.querySelectorAll("#tokenList li");
  tokens.forEach(token => {
    token.style.display = token.innerText.toLowerCase().includes(query) ? "block" : "none";
  });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

function exportToCSV() {
  const tokens = document.querySelectorAll("#tokenList li");
  let csv = "Token,Amount,Value(USD)\n";
  tokens.forEach(li => {
    const parts = li.innerText.split("\n");
    const token = parts[0].split(": ")[1];
    const amount = parts[1].split(": ")[1];
    const value = parts[2].split(": ")[1].replace("$", "");
    csv += `${token},${amount},${value}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_tokens.csv";
  a.click();
}
