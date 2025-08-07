async function scanWallet() {
  const walletAddress = document.getElementById('walletInput').value.trim();
  const resultsDiv = document.getElementById('results');

  if (!walletAddress) {
    resultsDiv.innerHTML = '<p>Please enter a wallet address.</p>';
    return;
  }

  resultsDiv.innerHTML = '<p>Loading wallet data...</p>';

  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=c96a3c81-a711-4d05-8d98-19de7f38722b`);
    const data = await response.json();

    if (!data.tokens || data.tokens.length === 0) {
      resultsDiv.innerHTML = '<p>No tokens found in this wallet.</p>';
      return;
    }

    let html = `<h2>Wallet Overview</h2>`;
    html += '<table><tr><th>Token</th><th>Amount</th><th>Symbol</th></tr>';

    data.tokens.forEach(token => {
      html += `<tr><td><img src="${token.logo || ''}" width="20"/> ${token.name || 'Unknown'}</td><td>${token.amount}</td><td>${token.symbol || ''}</td></tr>`;
    });

    html += '</table>';
    resultsDiv.innerHTML = html;
  } catch (err) {
    resultsDiv.innerHTML = `<p>Error fetching wallet data. Please check the address and try again.</p>`;
  }
}
