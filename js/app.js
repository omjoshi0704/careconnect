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
  loadProfilePage();
  loadSavedReviews();
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

async function submitReview() {
  const text = document.getElementById("reviewText")?.value.trim();
  const wrap = document.getElementById("starSelect");
  const rating = Number(wrap?.dataset.value || 5);
  if (!text) { showToast("Please add a short review"); return; }
  try {
    const response = await apiFetch("/api/reviews", {method:"POST", body:JSON.stringify({rating, review_text:text})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Review could not be saved.");
    document.getElementById("reviewText").value = "";
    await loadSavedReviews();
    showToast("Review saved to database!");
  } catch (e) { showToast(e.message || "Sign in to submit a review."); }
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

async function confirmBooking() {
  const doctorName = document.getElementById("doctor")?.value.trim();
  const date = document.getElementById("appointmentDate")?.value;
  const timeLabel = document.getElementById("appointmentTime")?.value || "";
  const timeMap = {"10:00 AM":"10:00","12:00 PM":"12:00","4:00 PM":"16:00","6:30 PM":"18:30"};
  const time = timeMap[timeLabel] || timeLabel;
  if (!getCareConnectToken()) { showToast("Please sign in first."); location.href="../index.html"; return; }
  if (!window.selectedDoctorId || !doctorName || !date || !time) { showToast("Choose a registered doctor, date and time."); return; }
  if (date < new Date().toISOString().slice(0,10)) { showToast("Please select today or a future date."); return; }
  try {
    const response = await apiFetch("/api/appointments", {method:"POST", body:JSON.stringify({doctor_id:Number(window.selectedDoctorId), appt_date:date, appt_time:time})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Appointment could not be saved.");
    showToast("Appointment saved. Booking ID: " + data.appointment_id + ". Status: pending.");
  } catch (e) { showToast(e.message || "Appointment failed."); }
}

async function loadProfilePage() {
  const form = document.getElementById("profileForm");
  if (!form) return;
  try {
    const response = await apiFetch("/api/profile");
    if (!response.ok) throw new Error("Please sign in again.");
    const {profile} = await response.json();
    for (const key of ["name","email","phone","emergency_contact","address","date_of_birth"]) {
      const el = document.getElementById("profile_" + key);
      if (el) el.value = profile[key] || "";
    }
  } catch (e) { showToast(e.message); }
}

async function saveProfile() {
  const payload = {};
  for (const key of ["name","email","emergency_contact","address","date_of_birth"]) {
    payload[key] = document.getElementById("profile_" + key)?.value.trim() || "";
  }
  try {
    const response = await apiFetch("/api/profile", {method:"PUT", body:JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Profile could not be saved.");
    showToast("Profile saved in database.");
  } catch (e) { showToast(e.message || "Profile save failed."); }
}

async function loadSavedReviews() {
  const box = document.getElementById("reviewList");
  if (!box) return;
  try {
    const response = await fetch("/api/reviews");
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.reviews) && data.reviews.length) {
      reviews = data.reviews.map(r => ({...r, initials:String(r.name||"").split(/\\s+/).map(x=>x[0]||"").join("").slice(0,2).toUpperCase()}));
      renderReviews();
    }
  } catch {}
}

async function requestAmbulance() {
  if (!getCareConnectToken()) { showToast("Please sign in as a patient first."); location.href="../index.html"; return; }
  const locationText = document.getElementById("location")?.value.trim();
  const emergencySelect = document.getElementById("emergencyType");
  const emergencyType = emergencySelect?.value || "Other";
  if (!locationText) { showToast("Enter your pickup location first."); return; }
  try {
    const response = await apiFetch("/api/ambulance/request", {method:"POST", body:JSON.stringify({location:locationText, emergency_type:emergencyType})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ambulance request could not be saved.");
    const result = document.getElementById("ambulanceResult");
    if (result) {
      result.hidden = false;
      document.getElementById("ambulanceForm").hidden = true;
      const p = result.querySelector(".success-box p");
      if (p) p.textContent = `Request #${data.request_id} saved. Current status: ${data.status}. ${data.message || ""} This project does not yet send live SMS/push notifications; do not rely on it for emergencies.`;
      const eta = result.querySelector(".eta-mini"); if (eta) eta.innerHTML = `<span>🚑</span><div><b>Request status: ${escapeHtml(data.status)}</b><small>No verified live ETA is available.</small></div>`;
      const mapLabel = result.querySelector(".map-label"); if (mapLabel) mapLabel.textContent = "Request recorded — no live route";
    }
    showToast("Request saved. Status: " + data.status);
  } catch (e) { showToast(e.message || "Request failed."); }
}

function sendSOS() {
  showToast("SOS demo disabled. Use the request form for a database record; for a real emergency call 112.");
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
