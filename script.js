const API_KEY = "YOUR_HELIUS_API_KEY"; // Replace with your key

async function getSOLPrice() {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
  const data = await res.json();
  return data.solana.usd;
}

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) return alert("Enter a wallet address!");

  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${API_KEY}`);
    const data = await response.json();
    const solPrice = await getSOLPrice();

    const nativeSOL = (data.nativeBalance || 0) / 1e9;
    const solUSD = nativeSOL * solPrice;

    document.getElementById("nativeBalance").innerText = `💰 Native SOL Balance: ${nativeSOL.toFixed(4)} SOL ($${solUSD.toFixed(2)})`;

    const tokens = data.tokens || [];
    let totalUSD = solUSD;
    const tokenList = document.getElementById("tokenList");
    tokenList.innerHTML = "";
    const chartLabels = [], chartData = [];

    for (const token of tokens) {
      const amount = token.amount / (10 ** token.decimals || 0);
      const mint = token.mint;
      let price = 0;

      try {
        const priceRes = await fetch(`https://public-api.birdeye.so/public/price?address=${mint}`, {
          headers: { "x-chain": "solana" },
        });
        const priceData = await priceRes.json();
        price = priceData.data?.value || 0;
      } catch (e) {}

      const usdValue = price * amount;
      totalUSD += usdValue;

      const li = document.createElement("li");
      li.className = "token-item";
      li.innerHTML = `<strong>Mint:</strong> ${mint}<br><strong>Amount:</strong> ${amount.toFixed(4)}<br><strong>Value:</strong> $${usdValue.toFixed(2)}`;
      tokenList.appendChild(li);

      if (usdValue > 0) {
        chartLabels.push(mint.slice(0, 4) + "..." + mint.slice(-4));
        chartData.push(usdValue);
      }
    }

    document.getElementById("totalWorth").innerText = `💎 Estimated Total Wallet Worth: ~$${totalUSD.toFixed(2)} USD`;

    renderPortfolioChart(chartLabels, chartData);
    generateAISummary(nativeSOL, tokens.length, totalUSD);
  } catch (err) {
    document.getElementById("nativeBalance").innerText = "❌ Failed to fetch wallet data.";
  }
}

function exportCSV() {
  const rows = [["Mint", "Amount", "Value"]];
  document.querySelectorAll("#tokenList li").forEach(li => {
    const mint = li.innerHTML.match(/Mint:<\/strong> (.+?)<br>/)?.[1] || "Unknown";
    const amount = li.innerHTML.match(/Amount:<\/strong> (.+?)<br>/)?.[1] || "0";
    const value = li.innerHTML.match(/Value:<\/strong> \$(.+)/)?.[1] || "0";
    rows.push([mint, amount, value]);
  });

  let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "wallet_tokens.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function filterTokens() {
  const filter = document.getElementById("searchInput").value.toUpperCase();
  document.querySelectorAll("#tokenList li").forEach(li => {
    li.style.display = li.innerText.toUpperCase().includes(filter) ? "" : "none";
  });
}

function renderPortfolioChart(labels, data) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  if (window.pieChart) window.pieChart.destroy();
  window.pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data }],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
    },
  });
}

function generateAISummary(sol, tokenCount, worth) {
  const summary = `This wallet holds approximately ${sol.toFixed(2)} SOL and ${tokenCount} tokens, with a total estimated value of $${worth.toFixed(2)}. It appears to be ${worth > 1000 ? "well-funded" : "a light user"} on the Solana network.`;
  document.getElementById("aiSummary").innerText = summary;
}

async function renderSOLChart() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7");
  const data = await res.json();
  const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());
  const prices = data.prices.map(p => p[1]);

  new Chart(document.getElementById("solChart").getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "SOL Price (7d)", data: prices, borderWidth: 2 }],
    },
  });
}

renderSOLChart();
