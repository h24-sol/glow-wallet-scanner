
const API_KEY = "a301848c-a27a-4b00-a2b1-7e0afab088a2"; // Your actual key
const heliusBase = "https://api.helius.xyz/v0";

async function scanWallet() {
  const address = document.getElementById("walletAddress").value.trim();
  const errorEl = document.getElementById("error");
  errorEl.textContent = "";

  if (!address) {
    errorEl.textContent = "❌ Please enter a wallet address.";
    return;
  }

  try {
    // Wallet Creation Date
    const txnRes = await fetch(`${heliusBase}/addresses/${address}/transactions?api-key=${API_KEY}`);
    const txns = await txnRes.json();
    const creationDate = txns.length ? new Date(txns[txns.length - 1].timestamp * 1000).toLocaleString() : "Not found";
    document.getElementById("creationDate").textContent = creationDate;

    // Balances & Burned Tokens
    const balRes = await fetch(`${heliusBase}/addresses/${address}/balances?api-key=${API_KEY}`);
    const balances = await balRes.json();

    let totalValue = 0;
    let burnedCount = 0;
    let labels = [], values = [];

    for (const token of balances.tokens) {
      totalValue += token.amount * token.price;
      if (token.tokenName.toLowerCase().includes("burn")) burnedCount++;
      labels.push(token.tokenName || "Unnamed Token");
      values.push(token.amount * token.price);
    }

    document.getElementById("totalVolume").textContent = "$" + totalValue.toFixed(2);
    document.getElementById("burnedCount").textContent = burnedCount;

    // Pie Chart
    const ctx = document.getElementById("tokenPieChart").getContext("2d");
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#4caf50','#2196f3','#ff9800','#f44336','#9c27b0']
        }]
      }
    });

    // Smart Wallet Detection (basic logic: > $1000 volume)
    const isSmart = totalValue > 1000 ? "Yes ✅" : "No ❌";
    document.getElementById("smartWallet").textContent = isSmart;

    // AI Summary (simplified)
    const aiSummary = `This wallet holds ${balances.tokens.length} tokens worth approx. $${totalValue.toFixed(2)}. ${isSmart === "Yes ✅" ? "Looks like a smart wallet." : "Average wallet."}`;
    document.getElementById("aiSummary").textContent = aiSummary;

  } catch (err) {
    errorEl.textContent = "❌ Error fetching data. Please try again.";
    console.error(err);
  }
}
