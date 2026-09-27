document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });
    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Open menu");
      });
    });
  }
  renderHomeDoctors();
  renderReviews();
  setupStarSelector();
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => demoAction(btn.dataset.action));
  });
});


function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':'&quot;', "'":"&#39;"
  })[char]);
}

/* ---------- reviews ---------- */
function renderReviews() {
  const box = document.getElementById("reviewList");
  if (!box || typeof reviews === "undefined") return;
  box.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      <p>"${escapeHtml(r.text)}"</p>
      <div class="review-who">
        <div class="avatar">${r.initials}</div>
        <div><b>${escapeHtml(r.name)}</b><small>Verified demo patient</small></div>
      </div>
    </div>`).join("");
}

function setupStarSelector() {
  const wrap = document.getElementById("starSelect");
  if (!wrap) return;
  wrap.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      wrap.dataset.value = btn.dataset.star;
      wrap.querySelectorAll("button").forEach(b => b.classList.toggle("active", Number(b.dataset.star) <= Number(btn.dataset.star)));
    });
  });
}

function submitReview() {
  const name = document.getElementById("reviewName")?.value.trim();
  const text = document.getElementById("reviewText")?.value.trim();
  const wrap = document.getElementById("starSelect");
  const rating = Number(wrap?.dataset.value || 5);
  if (!name || !text) { showToast("Please add your name and a short review"); return; }
  const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  reviews.unshift({name, initials, rating, text});
  renderReviews();
  document.getElementById("reviewName").value = "";
  document.getElementById("reviewText").value = "";
  wrap.dataset.value = 5;
  wrap.querySelectorAll("button").forEach(b => b.classList.add("active"));
  showToast("Thanks for your review!");
}

function renderHomeDoctors() {
  const box = document.getElementById("homeDoctors");
  if (!box || typeof doctors === "undefined") return;
  box.innerHTML = doctors.slice(0, 3).map(d => `
    <div class="doctor-mini">
      <div class="avatar">${d.initials}</div>
      <div class="info"><b>${d.name}</b><small>${d.specialty} • ${d.hospital}</small></div>
      <span class="available">${d.eta}</span>
    </div>`).join("");
}

function demoAction(message) {
  showToast(message || "Demo action completed!");
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = "✓ " + message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function confirmBooking() {
  const name = document.getElementById("patientName")?.value.trim();
  if (!name) { showToast("Please enter patient name"); return; }
  showToast("Appointment booked successfully!");
}

function requestAmbulance() {
  const name = document.getElementById("patientName")?.value.trim();
  const location = document.getElementById("location")?.value.trim();
  if (!name || !location) { showToast("Enter patient name and location"); return; }
  document.getElementById("ambulanceResult").hidden = false;
  document.getElementById("ambulanceForm").hidden = true;
  showToast("Ambulance request sent!");
}

function sendSOS() {
  document.getElementById("sosIdle").hidden = true;
  document.getElementById("sosResult").hidden = false;
  showToast("SOS sent — nearest ambulance notified!");
}

function searchMedicine() {
  const q = document.getElementById("medicine")?.value.trim();
  const result = document.getElementById("medicineResult");
  if (!q) { showToast("Enter a medicine name"); return; }
  result.innerHTML = `<div class="success-box"><div class="check">💊</div><h3>${escapeHtml(q)} found in demo pharmacy</h3><p>Demo stock: Available • Delivery estimate: 30–45 min</p><button class="btn btn-primary" onclick="showToast('Medicine added to cart!')">Add to cart</button></div>`;
}

function bookLab() {
  const test = document.getElementById("testName")?.value;
  showToast((test || "Diagnostic") + " booking confirmed!");
}

function uploadDemo() {
  showToast("Demo report upload completed!");
}
