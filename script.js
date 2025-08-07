const SOLANA_RPC = "https://mainnet.helius-rpc.com/?api-key=a2fb8074-3461-480a-a202-159d980fd02a";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

let currentTokens = [];

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Please enter a wallet address.");

  document.getElementById("nativeBalance").innerText = "💰 Native SOL Balance: Loading...";
  document.getElementById("totalWorth").innerText = "💎 Estimated Total Wallet Worth: Loading...";
  document.getElementById("tokenList").innerHTML = "";
  document.getElementById("aiSummary").innerText = "AI summary loading...";

  try {
    // Fetch SOL balance
    const solRes = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address]
      }),
    });
    const solData = await solRes.json();
    const solBalance = solData.result?.value / 1e9 || 0;

    // Get SOL price
    const priceRes = await fetch(COINGECKO_API);
    const priceData = await priceRes.json();
    const solPrice = priceData.solana.usd;
    const solValueUSD = solBalance * solPrice;

    document.getElementById("nativeBalance").innerText =
      `💰 Native SOL Balance: ${solBalance.toFixed(4)} SOL ($${solValueUSD.toFixed(2)})`;

    // Fetch token accounts
    const tokenRes = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" }
        ]
      }),
    });
    const tokenData = await tokenRes.json();
    const tokens = tokenData.result?.value || [];

    currentTokens = [];
    let totalUSD = solValueUSD;

    for (let t of tokens) {
      const info = t.account.data.parsed.info;
      const mint = info.mint;
      const amount = parseFloat(info.tokenAmount.uiAmountString || "0");
      const decimals = info.tokenAmount.decimals;

      // Fetch token name & price from Helius Enhanced Token API
      const tokenMeta = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=a2fb8074-3461-480a-a202-159d980fd02a`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mintAccounts: [mint] })
      });
      const metaJson = await tokenMeta.json();
      const tokenInfo = metaJson[0] || {};
      const tokenName = tokenInfo.name || mint.slice(0, 6) + "...";
      const symbol = tokenInfo.symbol || "???";
      const logo = tokenInfo.image || "";
      const price = tokenInfo.price || 0;
      const valueUSD = amount * price;
      totalUSD += valueUSD;

      currentTokens.push({ tokenName, symbol, amount, valueUSD, logo });
    }

    document.getElementById("totalWorth").innerText = `💎 Estimated Total Wallet Worth: ~$${totalUSD.toFixed(2)} USD`;

    // Display token list
    updateTokenList(currentTokens);
    updatePortfolioChart(currentTokens, totalUSD);
    updateSolChart();
    updateAISummary(address, solBalance, currentTokens, totalUSD);
  } catch (e) {
    console.error(e);
    document.getElementById("nativeBalance").innerText = "❌ Failed to load data";
    document.getElementById("totalWorth").innerText = "❌ Failed to calculate wallet value";
  }
}

function updateTokenList(tokens) {
  const list = document.getElementById("tokenList");
  list.innerHTML = "";

  tokens.forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${t.tokenName}</strong> (${t.symbol}) - ${t.amount.toFixed(2)} ($${t.valueUSD.toFixed(2)})`;
    list.appendChild(li);
  });
}

function updatePortfolioChart(tokens, total) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  const labels = tokens.map(t => `${t.tokenName} (${((t.valueUSD / total) * 100).toFixed(1)}%)`);
  const data = tokens.map(t => t.valueUSD);

  if (window.portfolioChart) window.portfolioChart.destroy();
  window.portfolioChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "right" }
      }
    }
  });
}

async function updateSolChart() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7");
  const data = await res.json();
  const prices = data.prices;

  const ctx = document.getElementById("solPriceChart").getContext("2d");
  if (window.solChart) window.solChart.destroy();
  window.solChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: prices.map(p => new Date(p[0]).toLocaleDateString()),
      datasets: [{
        label: "SOL Price (USD)",
        data: prices.map(p => p[1]),
        borderWidth: 2,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true
    }
  });
}

function updateAISummary(address, sol, tokens, total) {
  const summary = `This wallet (${address}) holds approximately ${sol.toFixed(2)} SOL and ${tokens.length} tokens, with a total estimated value of $${total.toFixed(2)}. It shows ${tokens.length > 5 ? 'moderate' : 'light'} activity on the Solana network.`;
  document.getElementById("aiSummary").innerText = summary;
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function filterTokens() {
  const search = document.getElementById("tokenSearch").value.toLowerCase();
  const filtered = currentTokens.filter(t =>
    t.tokenName.toLowerCase().includes(search) ||
    t.symbol.toLowerCase().includes(search)
  );
  updateTokenList(filtered);
}

function exportToCSV() {
  let csv = "Token,Symbol,Amount,Value(USD)\n";
  currentTokens.forEach(t => {
    csv += `${t.tokenName},${t.symbol},${t.amount},${t.valueUSD.toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_tokens.csv";
  a.click();
}
