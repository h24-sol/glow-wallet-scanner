const HELIUS_API_KEY = "c96a3c81-a711-4d05-8d98-19de7f38722b"; // Replace if needed

async function fetchWalletData(address) {
  const url = `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API response not OK");

    const data = await res.json();

    const sol = data.nativeBalance / 1e9;
    let totalValue = sol * 0.16; // You can fetch real-time SOL price if needed

    let tokenHTML = "";
    const tokens = data.tokens || [];

    for (const token of tokens) {
      const amount = token.amount / Math.pow(10, token.decimals || 0);
      tokenHTML += `
        <div>
          <strong>Mint:</strong> ${token.mint}<br>
          <strong>Amount:</strong> ${amount.toFixed(4)}
        </div>
        <hr>
      `;
    }

    document.getElementById("result").innerHTML = `
      <p>💰 Native SOL Balance: ${sol.toFixed(4)} SOL ($${(sol * 0.16).toFixed(2)})</p>
      <div>🔹 Tokens:</div>
      ${tokenHTML || "No tokens found"}
      <p>💎 Estimated Total Wallet Worth: ~$${totalValue.toFixed(2)} USD</p>
    `;
  } catch (err) {
    console.error("Fetch failed:", err);
    document.getElementById("result").innerHTML = "❌ Failed to fetch wallet data. Please check the address or try again.";
  }
}

document.getElementById("scanBtn").addEventListener("click", () => {
  const address = document.getElementById("walletInput").value.trim();
  if (!address) {
    alert("Please enter a wallet address.");
    return;
  }
  fetchWalletData(address);
});
