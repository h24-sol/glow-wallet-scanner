// script.js - final functional scanner
const HELIUS_KEY = "a301848c-a27a-4b00-a2b1-7e0afab088a2";
const HELIUS_BASE = "https://api.helius.xyz/v0";

const walletInput = document.getElementById('walletInput');
const scanBtn = document.getElementById('scanBtn');
const status = document.getElementById('status');
const outAddress = document.getElementById('outAddress');
const creationDateEl = document.getElementById('creationDate');
const totalVolumeEl = document.getElementById('totalVolume');
const burnedCountEl = document.getElementById('burnedCount');
const smartWalletEl = document.getElementById('smartWallet');
const aiSummaryEl = document.getElementById('aiSummary');
const solCtx = document.getElementById('solChart').getContext('2d');
const pieCtx = document.getElementById('pieChart').getContext('2d');

let solChart, pieChart;

scanBtn.addEventListener('click', () => {
  const addr = walletInput.value.trim();
  scanWallet(addr);
});

async function scanWallet(address){
  if(!address){ showStatus('❌ Enter wallet address', true); return; }
  showStatus('⏳ Scanning...');
  outAddress.textContent = address;
  resetDisplays();

  try{
    // Fetch transactions (limit 100) to get creation date and transfers
    const txRes = await fetch(`${HELIUS_BASE}/addresses/${address}/transactions?api-key=${HELIUS_KEY}&limit=100`);
    if(!txRes.ok) throw new Error('Transactions fetch failed: ' + txRes.status);
    const txs = await txRes.json();
    if(Array.isArray(txs) && txs.length>0){
      const first = txs[txs.length-1];
      creationDateEl.textContent = new Date(first.timestamp*1000).toLocaleString();
    } else {
      creationDateEl.textContent = '-';
    }

    // Fetch balances
    const balRes = await fetch(`${HELIUS_BASE}/addresses/${address}/balances?api-key=${HELIUS_KEY}`);
    if(!balRes.ok) throw new Error('Balances fetch failed: ' + balRes.status);
    const balances = await balRes.json();

    // Parse tokens & compute USD-ish values
    let totalSol = 0;
    let tokenUsdValues = [];
    let burnedCount = 0;

    if(balances && Array.isArray(balances.tokens)){
      for(const t of balances.tokens){
        const amtRaw = Number(t.amount || 0);
        const decimals = Number(t.decimals || 0);
        const amount = decimals ? amtRaw / Math.pow(10, decimals) : amtRaw;
        let usd = 0;
        if(t.priceInfo && t.priceInfo.price){
          usd = amount * Number(t.priceInfo.price);
        } else if (t.usdPrice){
          usd = amount * Number(t.usdPrice);
        }
        tokenUsdValues.push({ label: t.tokenSymbol || t.tokenName || t.mint.slice(0,6), value: usd, rawAmount: amount });
      }
    } else if (balances && balances.nativeBalance !== undefined){
      totalSol = Number(balances.nativeBalance || 0) / 1e9;
    }

    if(balances && balances.nativeBalance) totalSol = Number(balances.nativeBalance) / 1e9;

    // Analyze transactions for native transfers and burns
    let totalInSol = 0, totalOutSol = 0;
    if(Array.isArray(txs)){
      for(const tx of txs){
        if(tx.nativeTransfers && Array.isArray(tx.nativeTransfers)){
          for(const n of tx.nativeTransfers){
            const lamports = Number(n.amount || 0);
            const sol = lamports / 1e9;
            if(n.toUserAccount === address) totalInSol += sol;
            if(n.fromUserAccount === address) totalOutSol += sol;
          }
        }
        if(tx.tokenTransfers && Array.isArray(tx.tokenTransfers)){
          for(const tr of tx.tokenTransfers){
            if(tr.toUserAccount === '11111111111111111111111111111111'){
              burnedCount += Number(tr.tokenAmount?.amount || 0) / Math.pow(10, tr.tokenAmount?.decimals || 0);
            }
          }
        }
      }
    }

    const totalVolumeSol = totalInSol + totalOutSol;
    totalVolumeEl.textContent = (totalVolumeSol>0) ? totalVolumeSol.toFixed(4) + ' SOL' : (totalSol? totalSol.toFixed(4) + ' SOL' : '-');
    burnedCountEl.textContent = burnedCount ? burnedCount.toFixed(4) : '-';

    // Smart wallet heuristics
    const knownSmart = checkKnownSmartContracts(address);
    const smartByVolume = totalVolumeSol > 100;
    smartWalletEl.textContent = (knownSmart ? 'Yes (known)' : (smartByVolume ? 'Likely (high volume)' : 'No'));

    // AI summary
    const ai = generateAISummary({ totalVolumeSol, burnedCount, tokenCount: tokenUsdValues.length });
    aiSummaryEl.textContent = ai;

    // Draw charts
    await drawSolPriceChart();
    drawPie(tokenUsdValues);

    showStatus('✅ Scan complete');
  } catch(err){
    console.error(err);
    showStatus('❌ Error fetching data. See console for details', true);
  }
}

function showStatus(msg, isError=false){
  status.textContent = msg;
  status.style.color = isError ? '#ff6b6b' : '#ffd166';
}

function resetDisplays(){
  creationDateEl.textContent = '-';
  totalVolumeEl.textContent = '-';
  burnedCountEl.textContent = '-';
  smartWalletEl.textContent = '-';
  aiSummaryEl.textContent = '-';
  if(solChart){ solChart.destroy(); solChart = null; }
  if(pieChart){ pieChart.destroy(); pieChart = null; }
}

function checkKnownSmartContracts(addr){
  const list = [
    'So11111111111111111111111111111111111111112',
    '11111111111111111111111111111111'
  ];
  return list.includes(addr);
}

function generateAISummary({ totalVolumeSol, burnedCount, tokenCount }){
  let parts = [];
  if(totalVolumeSol && totalVolumeSol>0) parts.push(`This wallet has been active with ~${totalVolumeSol.toFixed(4)} SOL volume in recent transactions.`);
  if(burnedCount && burnedCount>0) parts.push(`Detected ${burnedCount.toFixed(4)} burned tokens (possible token burns).`);
  parts.push(`Holds ${tokenCount} token types (top results shown in chart).`);
  if(totalVolumeSol > 100) parts.push('Behavior suggests a high-activity or institutional wallet.');
  return parts.join(' ');
}

async function drawSolPriceChart(){
  try{
    const res = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1');
    const data = await res.json();
    const prices = data.prices || [];
    const last = prices.slice(-24);
    const labels = last.map(p => new Date(p[0]).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    const values = last.map(p => Number(p[1].toFixed(2)));

    solChart = new Chart(solCtx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'SOL (USD)', data: values, borderColor: '#39ff14', tension:0.2, pointRadius:0 }]},
      options: { responsive:true, plugins:{legend:{display:false}} }
    });
  }catch(err){
    console.error('SOL price chart failed', err);
  }
}

function drawPie(arr){
  const filtered = arr.filter(a => a.value && a.value>0);
  const labels = filtered.map(f => f.label);
  const values = filtered.map(f => Number(f.value.toFixed(2)));
  if(values.length===0){
    pieChart = new Chart(pieCtx, { type:'doughnut', data:{ labels:['No tokens'], datasets:[{ data:[1], backgroundColor:['#444'] }]}, options:{plugins:{legend:{display:false}}} });
    return;
  }
  pieChart = new Chart(pieCtx, {
    type:'doughnut',
    data: { labels, datasets:[{ data: values, backgroundColor: palette(values.length) }] },
    options: { responsive:true }
  });
}

function palette(n){
  const base = ['#39ff14','#14bfff','#ff7f50','#ff1493','#ffa500','#8e44ad','#2ecc71','#e74c3c'];
  const out = [];
  for(let i=0;i<n;i++) out.push(base[i % base.length]);
  return out;
}

// initialize empty charts
drawSolPriceChart();
pieChart = new Chart(pieCtx, { type:'doughnut', data:{ labels:['-'], datasets:[{ data:[1], backgroundColor:['#222']}]}, options:{plugins:{legend:{display:false}}} });
