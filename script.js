const apiKey = "a301848c-a27a-4b00-a2b1-7e0afab088a2"; // Replace with your actual Helius API key

async function fetchWalletData() {
  const address = document.getElementById("walletInput").value;
  if (!address) return displayError("Please enter a wallet address");

  try {
    const [balances, transactions] = await Promise.all([
      fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${apiKey}`).then(res => res.json()),
      fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=10`).then(res => res.json()),
    ]);

    const walletAge = await fetchWalletAge(address);
    const totalVolume = calculateVolume(transactions);
    const burned = findBurnedTokens(transactions);

    renderWalletData(balances, walletAge, transactions, totalVolume, burned);
  } catch (err) {
    displayError("Failed to fetch wallet data");
  }
}

async function fetchWalletAge(address) {
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=1&before=now`;
  const res = await fetch(url);
  const data = await res.json();
  const firstTx = data?.[0];
  return firstTx ? new Date(firstTx.timestamp * 1000).toDateString() : "Unknown";
}

function calculateVolume(txs) {
  let totalIn = 0, totalOut = 0;
  txs.forEach(tx => {
    if (tx.type === "TRANSFER") {
      tx.tokenTransfers?.forEach(t => {
        if (t.toUserAccount?.includes(tx.account)) totalIn += +t.tokenAmount;
        else totalOut += +t.tokenAmount;
      });
    }
  });
  return { totalIn, totalOut };
}

function findBurnedTokens(txs) {
  const burned = {};
  txs.forEach(tx => {
    tx.tokenTransfers?.forEach(t => {
      if (t.toUserAccount === "11111111111111111111111111111111") {
        burned[t.tokenSymbol] = (burned[t.tokenSymbol] || 0) + +t.tokenAmount;
      }
    });
  });
  return burned;
}

function renderWalletData(data, creationDate, txs, volume, burned) {
  const container = document.getElementById("walletData");
  container.innerHTML = "";

  const totalUSD = data.tokens.reduce((sum, t) => sum + (t.amount / Math.pow(10, t.decimals)) * (t.price || 0), 0).toFixed(2);
  container.innerHTML += `<p><strong>Total Asset Value (USD):</strong> $${totalUSD}</p>`;
  container.innerHTML += `<p><strong>Wallet Created On:</strong> ${creationDate}</p>`;
  container.innerHTML += `<p><strong>Total Transactions:</strong> ${txs.length}</p>`;
  container.innerHTML += `<p><strong>Total Volume In:</strong> ${volume.totalIn.toFixed(2)}</p>`;
  container.innerHTML += `<p><strong>Total Volume Out:</strong> ${volume.totalOut.toFixed(2)}</p>`;

  container.innerHTML += `<h3>🔥 Burned Tokens:</h3>`;
  if (Object.keys(burned).length > 0) {
    for (const [symbol, amt] of Object.entries(burned)) {
      container.innerHTML += `<p><strong>${symbol}:</strong> ${amt.toFixed(2)}</p>`;
    }
  } else {
    container.innerHTML += `<p>No burned tokens detected.</p>`;
  }

  container.innerHTML += `<h3>🎯 Token Holdings:</h3>`;
  data.tokens.forEach(t => {
    const value = (t.amount / Math.pow(10, t.decimals)).toFixed(4);
    const price = t.price ? `$${(value * t.price).toFixed(2)}` : "Price N/A";
    container.innerHTML += `
      <div class="token">
        <p><strong>${t.tokenAccount?.tokenName || "Unknown"} (${t.tokenAccount?.tokenSymbol || "?"})</strong></p>
        <p>Amount: ${value}</p>
        <p>USD Value: ${price}</p>
      </div>
    `;
  });

  container.innerHTML += `<h3>🧾 Recent Transactions:</h3>`;
  if (txs.length === 0) {
    container.innerHTML += "<p>No recent transactions found.</p>";
  } else {
    txs.forEach(tx => {
      container.innerHTML += `<p>${new Date(tx.timestamp * 1000).toLocaleString()} - ${tx.type}</p>`;
    });
  }
}

function displayError(msg) {
  const container = document.getElementById("walletData");
  container.innerHTML = `<p style="color: red;">❌ ${msg}</p>`;
}
