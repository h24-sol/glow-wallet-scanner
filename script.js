const HELIUS_API_KEY = "a301848c-a27a-4b00-a2b1-7e0afab088a2";

async function scanWallet() {
  const address = document.getElementById("walletInput").value.trim();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "⏳ Scanning wallet...";

  try {
    const [balancesRes, txRes] = await Promise.all([
      fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`),
      fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=100`)
    ]);

    const balances = await balancesRes.json();
    const txs = await txRes.json();

    // Calculate data
    let totalIn = 0, totalOut = 0, burned = 0;
    const firstTx = txs[txs.length - 1];
    const creationDate = firstTx ? new Date(firstTx.timestamp * 1000).toLocaleString() : "Unknown";

    txs.forEach(tx => {
      if (!tx.tokenTransfers) return;
      tx.tokenTransfers.forEach(t => {
        const amt = parseFloat(t.tokenAmount.amount || 0);
        if (t.toUserAccount === address) totalIn += amt;
        if (t.fromUserAccount === address) totalOut += amt;
        if (t.toUserAccount === "11111111111111111111111111111111") burned += amt;
      });
    });

    // Build wallet info
    const labels = [], values = [];
    let holdingsHTML = `<h3>Token Holdings</h3><ul>`;
    for (let token of balances.tokens) {
      if (token.amount > 0) {
        const usd = (token.priceInfo?.totalPrice || 0).toFixed(2);
        labels.push(token.tokenInfo?.name || token.mint);
        values.push(parseFloat(usd));
        holdingsHTML += `<li>${token.tokenInfo?.name || token.mint} — $${usd}</li>`;
      }
    }
    holdingsHTML += `</ul>`;

    // Smart wallet detection
    const knownSmartWallets = [
      "So11111111111111111111111111111111111111112", // Jupiter
      "9xQeWvG816bUx9EPtG7Y6KJyx1bXTADnYReWzu5fZ1KP", // Raydium
      "MERcK9HnyZKxQ1K7xKPVxBJc49Qndv1cGPKszpCvA4Hr", // Mercurial
    ];
    const isSmart = knownSmartWallets.includes(address);

    // AI Summary (basic logic)
    const aiSummary = generateAISummary({
      totalIn,
      totalOut,
      burned,
      tokenCount: balances.tokens.length,
      isSmart
    });

    // Final output
    resultDiv.innerHTML = `
      <h3>Wallet Info</h3>
      <p><strong>Address:</strong> ${address}</p>
      <p><strong>Creation Date:</strong> ${creationDate}</p>
      <p><strong>Total Volume In:</strong> ${totalIn.toFixed(2)}</p>
      <p><strong>Total Volume Out:</strong> ${totalOut.toFixed(2)}</p>
      <p><strong>Total Burned Tokens:</strong> ${burned.toFixed(2)}</p>
      <p><strong>Smart Wallet:</strong> ${isSmart ? "🧠 Yes (Known)" : "No"}</p>
      ${holdingsHTML}
      <h3>🤖 AI Summary</h3>
      <p>${aiSummary}</p>
    `;

    createPieChart(labels, values);
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = "❌ Error fetching data. Please try again.";
  }
}

function generateAISummary({ totalIn, totalOut, burned, tokenCount, isSmart }) {
  let summary = "This wallet is ";
  if (isSmart) summary += "likely a smart contract or whale. ";
  else summary += "a normal user wallet. ";

  if (totalIn > totalOut) summary += "It's accumulating tokens. ";
  else summary += "It's distributing/selling tokens. ";

  if (burned > 100) summary += "Large amount of tokens burned — might be a project deployer. ";
  if (tokenCount > 10) summary += "Diversified portfolio. ";
  else summary += "Low token diversity. ";

  return summary;
}

// Price chart
async function drawSolChart() {
  const ctx = document.getElementById("solPriceChart").getContext("2d");
  const prices = await fetchSOLPriceHistory();
  const labels = prices.map(p => p.time);
  const data = prices.map(p => p.price);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'SOL Price (USD)',
        data,
        borderColor: 'green',
        borderWidth: 2,
        tension: 0.1,
        fill: false
      }]
    }
  });
}

async function fetchSOLPriceHistory() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1&interval=hourly");
    const data = await res.json();
    return data.prices.slice(-10).map(p => ({
      time: new Date(p[0]).toLocaleTimeString(),
      price: p[1].toFixed(2)
    }));
  } catch (err) {
    console.error("Error fetching price:", err);
    return [];
  }
}

// Pie chart
function createPieChart(labels, values) {
  const ctx = document.getElementById('holdingsChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(() => getRandomColor())
      }]
    }
  });
}

function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

// Init price chart on page load
drawSolChart();

