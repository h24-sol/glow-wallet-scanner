// script.js

const HELIUS_API_KEY = "a2fb8074-3461-480a-a202-159d980fd02a";
const TOKEN_LIST_URL = "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";
let tokenMap = new Map();

// Load token names from Solana token list
fetch(TOKEN_LIST_URL)
  .then((res) => res.json())
  .then((data) => {
    data.tokens.forEach((t) => {
      tokenMap.set(t.address, t);
    });
  });

async function scanWallet() {
  const wallet = document.getElementById("walletInput").value.trim();
  if (!wallet) return alert("Please enter a wallet address");

  document.getElementById("tokenList").innerHTML = "Loading...";
  document.getElementById("errorMessage").innerText = "";

  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getTokenAccountsByOwner",
        params: [
          wallet,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" }
        ]
      })
    });
    const data = await res.json();
    if (!data.result || !data.result.value) throw new Error("Invalid response");

    const tokens = data.result.value.map((t) => {
      const mint = t.account.data.parsed.info.mint;
      const amount = parseFloat(t.account.data.parsed.info.tokenAmount.uiAmount);
      return { mint, amount };
    }).filter(t => t.amount > 0);

    displayTokens(tokens);
  } catch (err) {
    document.getElementById("errorMessage").innerText = "❌ Failed to load data";
    console.error(err);
  }
}

function displayTokens(tokens) {
  const list = document.getElementById("tokenList");
  list.innerHTML = "";

  let totalValue = 0;
  const values = [];
  const labels = [];

  tokens.forEach((token) => {
    const info = tokenMap.get(token.mint);
    const name = info ? info.name : token.mint.substring(0, 6);
    const symbol = info ? info.symbol : "UNKNOWN";
    const icon = info && info.logoURI ? `<img src='${info.logoURI}' width='20'/>` : "";

    const price = info && info.extensions && info.extensions.coingeckoId ? 1 : 1;
    const value = token.amount * price;
    totalValue += value;

    values.push(value);
    labels.push(symbol);

    const item = document.createElement("li");
    item.innerHTML = `${icon} <strong>${name}</strong> (${symbol}): ${token.amount.toFixed(2)}`;
    list.appendChild(item);
  });

  generatePortfolioChart(labels, values);
}

function exportCSV() {
  const rows = [["Token", "Amount"]];
  document.querySelectorAll("#tokenList li").forEach((li) => {
    const text = li.innerText;
    const [namePart, amountPart] = text.split(":");
    rows.push([namePart.trim(), amountPart.trim()]);
  });

  let csv = "";
  rows.forEach((r) => {
    csv += r.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallet_tokens.csv";
  a.click();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function filterTokens() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll("#tokenList li").forEach((li) => {
    li.style.display = li.innerText.toLowerCase().includes(query) ? "" : "none";
  });
}

function generatePortfolioChart(labels, values) {
  const ctx = document.getElementById("portfolioChart").getContext("2d");
  if (window.pieChart) window.pieChart.destroy();
  window.pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        label: "Token Distribution",
        data: values,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}
