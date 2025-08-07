const API_KEY = 'c96a3c81-a711-4d05-8d98-19de7f38722b';
let solPrice = 0;

async function getSOLPrice() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await res.json();
  solPrice = data.solana.usd;
  return solPrice;
}

async function scanWallet() {
  const wallet = document.getElementById('walletInput').value.trim();
  if (!wallet) return alert("Enter a wallet address!");

  document.getElementById('nativeBalance').innerText = "Loading...";
  document.getElementById('tokenList').innerHTML = "";

  const [price, walletRes] = await Promise.all([
    getSOLPrice(),
    fetch(`https://mainnet.helius.xyz/v1/account/${wallet}/tokens?api-key=${API_KEY}`).then(res => res.json())
  ]);

  const nativeLamports = walletRes.nativeBalance || 0;
  const tokens = walletRes.tokens || [];

  const sol = nativeLamports / 1e9;
  const usd = (sol * price).toFixed(2);
  document.getElementById('nativeBalance').innerText = `💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${usd})`;

  let totalUSD = parseFloat(usd);
  let labels = [];
  let values = [];
  const tokenList = document.getElementById('tokenList');

  tokens.forEach(t => {
    const amount = t.amount / Math.pow(10, t.decimals || 0);
    if (amount <= 0) return;
    const line = document.createElement('div');
    line.textContent = `Mint: ${t.mint || "N/A"} | Amount: ${amount.toFixed(4)}`;
    tokenList.appendChild(line);
    labels.push(t.mint.slice(0, 4) + "..." + t.mint.slice(-4));
    values.push(amount);
  });

  document.getElementById('totalWorth').innerText = `💎 Estimated Total Wallet Worth: ~$${totalUSD.toFixed(2)} USD`;
  generatePieChart(labels, values);
  generateSOLChart();
  aiSummary(sol, tokens.length, totalUSD);
}

function searchToken() {
  const filter = document.getElementById("searchInput").value.toLowerCase();
  const items = document.querySelectorAll("#tokenList div");
  items.forEach(div => {
    div.style.display = div.textContent.toLowerCase().includes(filter) ? "" : "none";
  });
}

function exportCSV() {
  const wallet = document.getElementById('walletInput').value.trim();
  const items = document.querySelectorAll("#tokenList div");
  let csv = "Wallet," + wallet + "\nToken Mint,Amount\n";
  items.forEach(div => {
    csv += div.textContent.replace(" | Amount: ", ",") + "\n";
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${wallet}_tokens.csv`;
  link.click();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

function aiSummary(sol, tokenCount, value) {
  let level = value < 1 ? "light" : value < 100 ? "moderate" : "heavy";
  document.getElementById("summaryText").innerText = 
    `This wallet holds approximately ${sol.toFixed(2)} SOL and ${tokenCount} tokens, with a total estimated value of $${value.toFixed(2)}. ` +
    `It appears to be a ${level} user on the Solana network.`;
}

function generatePieChart(labels, values) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values }] },
    options: { responsive: true }
  });
}

async function generateSOLChart() {
  const res = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7');
  const data = await res.json();
  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());

  const ctx = document.getElementById("solPriceChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "SOL Price (7D)",
        data: prices,
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true
    }
  });
}
