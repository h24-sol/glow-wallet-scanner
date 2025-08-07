const API_KEY = "2fb8074-3461-480a-a202-159d980fd02a";

async function fetchWalletData() {
  const address = document.getElementById("walletInput").value.trim();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  if (!address) {
    resultDiv.innerHTML = "<p style='color:red;'>❌ Wallet address is required.</p>";
    return;
  }

  try {
    const balancesUrl = `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${API_KEY}`;
    const response = await fetch(balancesUrl);
    const data = await response.json();

    if (!data.tokens || data.tokens.length === 0) {
      resultDiv.innerHTML = "<p>No token balances found.</p>";
      return;
    }

    let totalValueUSD = 0;
    const labels = [];
    const values = [];
    const list = [];

    data.tokens.forEach(token => {
      if (token.amount > 0 && token.price_info?.usd) {
        const usdValue = token.amount * token.price_info.usd;
        totalValueUSD += usdValue;
        labels.push(token.token_account.label || token.token_account.mint.slice(0, 6));
        values.push(usdValue);
        list.push(`<li>${token.token_account.label || "Unknown Token"}: $${usdValue.toFixed(2)}</li>`);
      }
    });

    resultDiv.innerHTML = `
      <h3>Total Asset Value: $${totalValueUSD.toFixed(2)}</h3>
      <ul style="text-align:left; list-style: none;">${list.join("")}</ul>
      <canvas id="pieChart" width="400" height="400"></canvas>
      <canvas id="solChart" width="600" height="300"></canvas>
    `;

    drawPieChart(labels, values);
    fetchSOLChart();

  } catch (error) {
    resultDiv.innerHTML = `<p style='color:red;'>Error fetching wallet data: ${error.message}</p>`;
  }
}

function drawPieChart(labels, data) {
  const ctx = document.getElementById("pieChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        label: "Token Distribution",
        data: data,
        borderWidth: 1
      }]
    }
  });
}

async function fetchSOLChart() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1");
    const chartData = await response.json();
    const prices = chartData.prices;

    const labels = prices.map(p => new Date(p[0]).toLocaleTimeString());
    const values = prices.map(p => p[1]);

    const ctx = document.getElementById("solChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "SOL Live Price (USD)",
          data: values,
          fill: false,
          borderColor: "#13ff85",
          tension: 0.1
        }]
      }
    });
  } catch (err) {
    console.error("SOL Chart Error:", err.message);
  }
}
