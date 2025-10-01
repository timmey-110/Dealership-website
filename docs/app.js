// Public site JS: fetch cars from the Flask API and render, handle inquiry form
const API_BASE = window.location.origin; // assumes same origin if served by Flask; change if hosting separately

let cars = [];
let filtered = [];

function formatCurrency(n){
  try{
    return new Intl.NumberFormat(undefined,{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);
  }catch(e){
    return `₦${Number(n).toLocaleString()}`;
  }
}

async function loadCars(){
  const grid = document.getElementById('carsGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '<div class="card" style="padding:16px">Loading cars...</div>';
  try{
    const res = await fetch(`${API_BASE}/api/cars`);
    const data = await res.json();
    cars = data.cars || [];
    filtered = [...cars];
    renderCars();
    populateInquirySelect();
  }catch(err){
    grid.innerHTML = '<div class="card" style="padding:16px;color:#ffb3b3">Failed to load cars. Check your server.</div>';
    console.error(err);
  }
}

function renderCars(){
  const grid = document.getElementById('carsGrid');
  const empty = document.getElementById('emptyState');
  if(filtered.length === 0){
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = filtered.map(c => {
    const title = `${c.year || ''} ${c.make || ''} ${c.model || ''}`.trim();
    const price = c.price ? formatCurrency(c.price) : '—';
    const img = (c.images && c.images[0]) || 'https://picsum.photos/900/600?grayscale&blur=2';
    const meta = [c.color, c.mileage ? `${c.mileage.toLocaleString()} km` : null, c.transmission, c.fuelType].filter(Boolean).join(' • ');
    return `
      <article class="car-card card">
        <div class="car-media">
          <span class="badge">${c.status || 'For Sale'}</span>
          <img src="${img}" alt="${title}" loading="lazy" />
        </div>
        <div class="car-body">
          <div class="car-title">
            <h4 style="margin:0">${title}</h4>
            <div class="price">${price}</div>
          </div>
          <div class="meta">${meta}</div>
          <div class="actions">
             <a class="btn secondary" href="#contact" onclick="prefillInquiry('${c.id}','${title.replace(/'/g, "\'")}')">Inquire</a>
             ${c.videoUrl ? `<a class="btn" href="${c.videoUrl}" target="_blank" rel="noopener">Watch Video</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function applyFilters(){
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const sort = document.getElementById('sortSelect').value;
  filtered = cars.filter(c => {
    const text = `${c.make||''} ${c.model||''} ${c.year||''} ${c.color||''}`.toLowerCase();
    return !q || text.includes(q);
  });
  const by = {
    newest: (a,b) => (b.createdAt || 0) - (a.createdAt || 0),
    price_low: (a,b) => (a.price||0) - (b.price||0),
    price_high: (a,b) => (b.price||0) - (a.price||0),
    year_high: (a,b) => (b.year||0) - (a.year||0),
    year_low: (a,b) => (a.year||0) - (b.year||0),
  }[sort] || ((a,b)=>0);
  filtered.sort(by);
  renderCars();
}

function prefillInquiry(id, title){
  const sel = document.getElementById('inqCarId');
  sel.value = id;
  const msg = document.getElementById('inqMessage');
  if(!msg.value) msg.value = `Hi, I'm interested in the ${title}. Is it still available?`;
}

function populateInquirySelect(){
  const sel = document.getElementById('inqCarId');
  sel.innerHTML = '<option value="">— Select a car —</option>' + cars.map(c=>{
    const title = `${c.year||''} ${c.make||''} ${c.model||''}`.trim();
    return `<option value="${c.id}">${title}</option>`;
  }).join('');
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('sortSelect').addEventListener('change', applyFilters);

document.getElementById('inquiryForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const status = document.getElementById('inqStatus');
  status.textContent = 'Sending...';
  const payload = {
    name: document.getElementById('inqName').value.trim(),
    email: document.getElementById('inqEmail').value.trim(),
    phone: document.getElementById('inqPhone').value.trim(),
    message: document.getElementById('inqMessage').value.trim(),
    carId: document.getElementById('inqCarId').value || null,
  };
  try{
    const res = await fetch(`${API_BASE}/api/inquiries`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Failed');
    status.textContent = 'Thanks! We'll get back to you shortly.';
    e.target.reset();
  }catch(err){
    status.textContent = 'Something went wrong. Please try again.';
    console.error(err);
  }
});

loadCars();
