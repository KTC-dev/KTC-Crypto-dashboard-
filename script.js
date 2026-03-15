// @ts-nocheck
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true";
  const tableBody = document.querySelector("#cryptoTable tbody");
  const searchInput = document.querySelector("#searchInput");
  let coinsData = [];

  const fetchCoins = async () => {
    const cached = localStorage.getItem('crypto_cache');
    const timestamp = localStorage.getItem('crypto_time');
    if (cached && timestamp && (Date.now() - timestamp < 120000)) {
      coinsData = JSON.parse(cached);
      renderAll(coinsData);
      return;
    }

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("API Limit");
      const data = await res.json();
      if (Array.isArray(data)) {
        coinsData = data;
        localStorage.setItem('crypto_cache', JSON.stringify(data));
        localStorage.setItem('crypto_time', Date.now());
        renderAll(data);
      }
    } catch (err) {
      if (cached) renderAll(JSON.parse(cached));
      if (tableBody) tableBody.innerHTML = "<tr><td colspan='8'>API Busy. Try again in 1 min.</td></tr>";
    }
  };

  const renderAll = (data) => {
    // 1. Top Lists (Fixes "Loading..." cards)
    const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    const updateList = (list, id, color) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = list.slice(0, 5).map(c => `
                <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span><img src="${c.image}" width="15"> ${c.symbol.toUpperCase()}</span>
                    <span style="color:${color}">${c.price_change_percentage_24h.toFixed(2)}%</span>
                </div>`).join('');
    };
    updateList(sorted, "gainersList", "#4ade80");
    updateList([...sorted].reverse(), "losersList", "#f87171");

    // 2. Main Table (Corrects alignment and connects buttons)
    if (!tableBody) return;
    tableBody.innerHTML = "";
    data.forEach((c, i) => {
      const tr = document.createElement("tr");
      const color = c.price_change_percentage_24h >= 0 ? '#4ade80' : '#f87171';

      tr.innerHTML = `
                <td>${i + 1}</td>
                <td><img src="${c.image}" width="20"> ${c.name}</td>
                <td>$${c.current_price.toLocaleString()}</td>
                <td style="color:${color}; font-weight:bold;">${c.price_change_percentage_24h.toFixed(2)}%</td>
                <td>$${(c.market_cap / 1e9).toFixed(1)}B</td>
                <td>$${(c.total_volume / 1e6).toFixed(1)}M</td>
                <td><canvas id="s-${c.id}" width="80" height="25"></canvas></td>
                <td><button class="view-btn">View Chart</button></td>
            `;

      // Connect the button to the real Modal
      const btn = tr.querySelector(".view-btn");
      btn.onclick = () => openCoinModal(c);

      tableBody.appendChild(tr);
      drawSpark(document.getElementById(`s-${c.id}`), c.sparkline_in_7d.price, color);
    });
  };

  // 3. Modal Functionality (Replaces the Bitcoin alert)
  const openCoinModal = (coin) => {
    const modal = document.getElementById("coinModal");
    const modalContent = document.getElementById("modalChart");
    modal.style.display = "block";

    modalContent.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                <img src="${coin.image}" width="40">
                <h2>${coin.name} Analysis</h2>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                <p><strong>Price:</strong> $${coin.current_price.toLocaleString()}</p>
                <p><strong>Rank:</strong> #${coin.market_cap_rank}</p>
                <p><strong>24h High:</strong> $${coin.high_24h.toLocaleString()}</p>
                <p><strong>24h Low:</strong> $${coin.low_24h.toLocaleString()}</p>
            </div>
            <canvas id="modalCanvas" width="500" height="250" style="background:#0f172a; border-radius:8px;"></canvas>
        `;

    drawSpark(document.getElementById("modalCanvas"), coin.sparkline_in_7d.price,
      coin.price_change_percentage_24h >= 0 ? '#4ade80' : '#f87171');
  };

  const drawSpark = (canvas, prices, color) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const min = Math.min(...prices), max = Math.max(...prices);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = (i / (prices.length - 1)) * canvas.width;
      const y = canvas.height - ((p - min) / (max - min)) * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  // Search function
  searchInput?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = coinsData.filter(c => c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term));
    renderAll(filtered);
  });

  // Close button logic
  document.querySelector(".close-btn").onclick = () => {
    document.getElementById("coinModal").style.display = "none";
  };

  fetchCoins();
});