const HELIUS_API_KEY = "a2fb8074-3461-480a-a202-159d980fd02a";

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Please enter a wallet address.");

  document.getElementById("nativeBalance").textContent = "💰 Native SOL Balance: Loading...";
  document.getElementById("totalWorth").textContent = "💎 Estimated Total Wallet Worth: Loading...";
  document.getElementById("tokenList").innerHTML = "<li>Loading...</li>";
  document.getElementById("aiSummary").textContent = "AI summary loading...";

  try {
    const [balanceRes, tokensRes] = await Promise.all([
      fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`),
      fetch(`https://api.helius.xyz/v0/addresses/${address}/tokens?api-key=${HELIUS_API_KEY}`)
    ]);

    const balanceData = await balanceRes.json();
    const tokenData = await tokensRes.json();

    const sol = balanceData.nativeBalance / 1e9;
    const solPrice = await fetchSOLPrice();
    const totalValue = sol * solPrice;

    document.getElementById("nativeBalance").textContent = `💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${(sol * solPrice).toFixed(2)})`;
    document.getElementById("totalWorth").textContent = `💎 Estimated Total Wallet Worth: ~$${totalValue.toFixed(2)} USD`;

    const tokenList = document.getElementById("tokenList");
    tokenList.innerHTML = "";

    let portfolioData = [];
    let totalPortfolioUSD = totalValue;

    for (const token of tokenData.tokens) {
      const tokenAmount = token.amount / Math.pow(10, token.decimals || 0);
      const priceRes = await fetch(`https://price.jup.ag/v4/price?ids=${token.mint}`);
      const priceData = await priceRes.json();
      const price = priceData.data?.[token.mint]?.price || 0;
      const usdValue = price * tokenAmount;
      totalPortfolioUSD += usdValue;

      const name = token.tokenInfo?.name || token.mint.slice(0, 6) + "...";

      const li = document.createElement("li");
      li.textContent = `${name}: ${tokenAmount.toFixed(4)} (~$${usdValue.toFixed(2)})`;
      tokenList.appendChild(li);

      if (usdValue > 0) {
        portfolioData.push({ name, value: usdValue });
      }
    }

    drawPortfolioChart(portfolioData, totalPortfolioUSD);
    drawSOLChart();
    generateAISummary(sol, tokenData.tokens.length, totalPortfolioUSD);

  } catch (e) {
    console.error(e);
    document.getElementById("tokenList").innerHTML = "<li>❌ Failed to load data</li>";
    document.getElementById("totalWorth").textContent = "❌ Failed to calculate wallet value";
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function exportToCSV() {
  const rows = [["Token", "Amount", "USD Value"]];
  document.querySelectorAll("#tokenList li").forEach(li => {
    const parts = li.textContent.split(": ");
    rows.push([parts[0], ...parts[1].split(" (~$")]);
  });

  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_tokens.csv";
  a.click();
}

function filterTokens() {
  const search = document.getElementById("tokenSearch").value.toLowerCase();
  document.querySelectorAll("#tokenList li").forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(search) ? "" : "none";
  });
}

function drawPortfolioChart(data, total) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map(d => `${d.name} (${((d.value / total) * 100).toFixed(1)}%)`),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(() => `hsl(${Math.random() * 360}, 80%, 60%)`)
      }]
    }
  });
}

async function drawSOLChart() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7");
  const data = await res.json();
  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());

  const ctx = document.getElementById("solPriceChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "SOL Price (USD)",
        data: prices,
        fill: false,
        borderColor: "#00ffa3",
        tension: 0.1
      }]
    }
  });
}

async function fetchSOLPrice() {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
  const data = await res.json();
  return data.solana.usd;
}

function generateAISummary(sol, tokenCount, totalUSD) {
  const summary = `This wallet holds approximately ${sol.toFixed(2)} SOL and ${tokenCount} tokens, with a total estimated value of $${totalUSD.toFixed(2)}. It appears to be ${totalUSD > 1000 ? "a moderately active" : "a light"} user on the Solana network.`;
  document.getElementById("aiSummary").textContent = summary;
}
