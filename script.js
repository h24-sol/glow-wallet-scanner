async function scanWallet() {
  const address = document.getElementById("wallet").value.trim();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "🔍 Scanning wallet...";

  try {
    // Get wallet balances
    const heliusRes = await fetch(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=c96a3c81-a711-4d05-8d98-19de7f38722b`);
    const heliusData = await heliusRes.json();
    const tokens = heliusData.tokens || [];
    const sol = heliusData.nativeBalance / 1e9;

    // Get SOL price
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const prices = await priceRes.json();
    const solPrice = prices.solana.usd;
    let totalValue = sol * solPrice;

    let html = `<h2>💰 Native SOL Balance</h2>
    <p>${sol.toFixed(4)} SOL ($${(sol * solPrice).toFixed(2)})</p>`;

    // Get token metadata (names + logos)
    const tokenMetaRes = await fetch(`https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json`);
    const tokenMeta = await tokenMetaRes.json();
    const tokenList = tokenMeta.tokens;

    if (tokens.length > 0) {
      html += `<h2>🪙 Tokens</h2>`;

      for (const token of tokens) {
        const mint = token.mint;
        const tokenInfo = tokenList.find(t => t.address === mint);
        const amount = token.amount / (10 ** token.decimals);

        let symbol = tokenInfo ? tokenInfo.symbol : 'Unknown';
        let logo = tokenInfo ? tokenInfo.logoURI : '';
        let usd = tokenInfo?.extensions?.coingeckoId
          ? await getTokenPrice(tokenInfo.extensions.coingeckoId)
          : 0;

        const valueUSD = amount * usd;
        totalValue += valueUSD;

        html += `
        <div class="token">
          ${logo ? `<img src="${logo}" alt="${symbol}"/>` : ''}
          <strong>${symbol}</strong> — ${amount.toFixed(4)} (${valueUSD.toFixed(2)} USD)
        </div>`;
      }
    } else {
      html += `<p>No SPL tokens found</p>`;
    }

    html += `<h2>💎 Estimated Total Wallet Value: $${totalValue.toFixed(2)}</h2>`;
    resultDiv.innerHTML = html;
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = "❌ Error fetching wallet data.";
  }
}

// Helper to get individual token USD price
async function getTokenPrice(coingeckoId) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
    const data = await res.json();
    return data[coingeckoId]?.usd || 0;
  } catch {
    return 0;
  }
}
