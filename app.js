// ── State ────────────────────────────────────────────────
const ADMIN_ID = "admin1";

let state = loadState();

function defaultState() {
  return {
    candidates: [
      { name: "Candidate 1", party: "Party A", votes: 0 },
      { name: "Candidate 2", party: "Party B", votes: 0 },
      { name: "Candidate 3", party: "Party C", votes: 0 }
    ],
    voters: [
      { id: "7321",   name: "Voter One",   hasVoted: false },
      { id: "732122", name: "Voter Two",   hasVoted: false },
      { id: "001",    name: "Voter Three", hasVoted: false },
      { id: "002",    name: "Voter Four",  hasVoted: false }
    ]
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem("votedesk");
    return raw ? JSON.parse(raw) : defaultState();
  } catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem("votedesk", JSON.stringify(state));
}

// ── Screen helpers ────────────────────────────────────────
let currentVoterId = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function logout() {
  currentVoterId = null;
  document.getElementById("login-id").value = "";
  document.getElementById("login-error").classList.add("hidden");
  showScreen("screen-login");
}

// ── Login ─────────────────────────────────────────────────
function handleLogin() {
  const id = document.getElementById("login-id").value.trim();
  const err = document.getElementById("login-error");

  if (!id) { showError(err, "Please enter your ID."); return; }

  if (id === ADMIN_ID) {
    err.classList.add("hidden");
    renderAdmin();
    showScreen("screen-admin");
    return;
  }

  const voter = state.voters.find(v => v.id === id);
  if (!voter) { showError(err, "ID not found. Please check and try again."); return; }
  if (voter.hasVoted) { showError(err, "You have already cast your vote. Thank you!"); return; }

  currentVoterId = id;
  err.classList.add("hidden");
  renderVoterScreen();
  showScreen("screen-voter");
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

document.getElementById("login-id").addEventListener("keydown", e => {
  if (e.key === "Enter") handleLogin();
});

// ── Voter screen ──────────────────────────────────────────
function renderVoterScreen() {
  const grid = document.getElementById("candidate-cards");
  grid.innerHTML = "";
  document.getElementById("voter-msg").classList.add("hidden");

  state.candidates.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "cand-card";
    card.innerHTML = `
      <div class="cand-num">${i + 1}</div>
      <div class="cand-name">${esc(c.name)}</div>
      <div class="cand-party">${esc(c.party)}</div>
    `;
    card.addEventListener("click", () => castVote(i));
    grid.appendChild(card);
  });
}

function castVote(candidateIndex) {
  if (!currentVoterId) return;

  const voter = state.voters.find(v => v.id === currentVoterId);
  if (!voter || voter.hasVoted) return;

  state.candidates[candidateIndex].votes++;
  voter.hasVoted = true;
  saveState();

  document.getElementById("candidate-cards").innerHTML = "";
  const msg = document.getElementById("voter-msg");
  msg.textContent = `✅ Your vote for "${state.candidates[candidateIndex].name}" has been recorded. Thank you!`;
  msg.classList.remove("hidden");

  showToast("Vote recorded successfully!");
  setTimeout(() => logout(), 3000);
}

// ── Admin screen ──────────────────────────────────────────
function renderAdmin() {
  renderResults();
  renderCandidatesList();
  renderVotersList();
  resetCandidateForm();
  resetVoterForm();
}

// ── Tab switching ─────────────────────────────────────────
function showTab(tabId, btn) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  btn.classList.add("active");

  if (tabId === "tab-results") renderResults();
  if (tabId === "tab-candidates") renderCandidatesList();
  if (tabId === "tab-voters") renderVotersList();
}

// ── Results ───────────────────────────────────────────────
function renderResults() {
  const total = state.candidates.reduce((s, c) => s + c.votes, 0);
  const container = document.getElementById("results-container");
  container.innerHTML = "";

  if (state.candidates.length === 0) {
    container.innerHTML = `<p style="color:var(--muted);text-align:center;padding:32px 0;">No candidates added yet.</p>`;
    return;
  }

  // Sort by votes descending for display
  const sorted = [...state.candidates].map((c, i) => ({ ...c, origIndex: i }))
    .sort((a, b) => b.votes - a.votes);

  sorted.forEach((c, rank) => {
    const pct = total > 0 ? Math.round((c.votes / total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `
      <div class="r-top">
        <div>
          <div class="r-name">${rank === 0 && total > 0 ? "🥇 " : ""}${esc(c.name)}</div>
          <div class="r-party">${esc(c.party)}</div>
        </div>
        <div class="r-count">${c.votes} <span style="font-size:.8rem;font-weight:500;color:var(--muted)">(${pct}%)</span></div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;
    container.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.style.cssText = "text-align:right;color:var(--muted);font-size:.85rem;margin-top:8px;";
  totalRow.textContent = `Total votes cast: ${total} / ${state.voters.length}`;
  container.appendChild(totalRow);
}

function resetVotes() {
  if (!confirm("Reset ALL votes? This cannot be undone.")) return;
  state.candidates.forEach(c => c.votes = 0);
  state.voters.forEach(v => v.hasVoted = false);
  saveState();
  renderResults();
  showToast("All votes have been reset.");
}

// ── Candidates management ─────────────────────────────────
function renderCandidatesList() {
  const list = document.getElementById("candidates-list");
  list.innerHTML = "";

  if (state.candidates.length === 0) {
    list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">No candidates yet. Add one above.</p>`;
    return;
  }

  state.candidates.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <div class="m-info">
        <div class="m-id">Candidate #${i + 1}</div>
        <div class="m-name">${esc(c.name)}</div>
        <div class="m-sub">${esc(c.party)} · ${c.votes} vote(s)</div>
      </div>
      <div class="m-actions">
        <button class="btn-icon" onclick="editCandidate(${i})">✏️ Edit</button>
        <button class="btn-icon del" onclick="deleteCandidate(${i})">🗑 Remove</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function saveCandidate() {
  const name  = document.getElementById("cand-name").value.trim();
  const party = document.getElementById("cand-party").value.trim();
  const idx   = parseInt(document.getElementById("cand-edit-index").value);

  if (!name) { showToast("Please enter a candidate name."); return; }

  if (idx === -1) {
    state.candidates.push({ name, party: party || "Independent", votes: 0 });
    showToast("Candidate added!");
  } else {
    state.candidates[idx].name  = name;
    state.candidates[idx].party = party || "Independent";
    showToast("Candidate updated!");
  }

  saveState();
  renderCandidatesList();
  renderResults();
  resetCandidateForm();
}

function editCandidate(i) {
  const c = state.candidates[i];
  document.getElementById("cand-name").value = c.name;
  document.getElementById("cand-party").value = c.party;
  document.getElementById("cand-edit-index").value = i;
  document.getElementById("candidate-form-title").textContent = "Edit Candidate";
  document.getElementById("cand-name").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteCandidate(i) {
  const c = state.candidates[i];
  if (!confirm(`Remove candidate "${c.name}"? Their votes will be lost.`)) return;
  state.candidates.splice(i, 1);
  saveState();
  renderCandidatesList();
  renderResults();
  showToast("Candidate removed.");
}

function resetCandidateForm() {
  document.getElementById("cand-name").value = "";
  document.getElementById("cand-party").value = "";
  document.getElementById("cand-edit-index").value = "-1";
  document.getElementById("candidate-form-title").textContent = "Add Candidate";
}

function cancelCandidateEdit() { resetCandidateForm(); }

// ── Voters management ─────────────────────────────────────
function renderVotersList() {
  const list = document.getElementById("voters-list");
  list.innerHTML = "";

  if (state.voters.length === 0) {
    list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">No voters registered yet.</p>`;
    return;
  }

  state.voters.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <div class="m-info">
        <div class="m-id">ID: ${esc(v.id)}</div>
        <div class="m-name">${esc(v.name)}</div>
        <div class="m-sub">${v.hasVoted
          ? '<span style="color:var(--success)">✅ Voted</span>'
          : '<span style="color:var(--muted)">⏳ Not voted</span>'}</div>
      </div>
      <div class="m-actions">
        <button class="btn-icon" onclick="editVoter(${i})">✏️ Edit</button>
        <button class="btn-icon del" onclick="deleteVoter(${i})">🗑 Remove</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function saveVoter() {
  const newId   = document.getElementById("new-voter-id").value.trim();
  const name    = document.getElementById("new-voter-name").value.trim();
  const oldId   = document.getElementById("voter-edit-old-id").value;

  if (!newId) { showToast("Please enter a Voter ID."); return; }
  if (!name)  { showToast("Please enter a voter name."); return; }

  const duplicate = state.voters.find(v => v.id === newId && v.id !== oldId);
  if (duplicate) { showToast("That ID already exists. Use a different one."); return; }

  if (oldId === "") {
    // Add new
    state.voters.push({ id: newId, name, hasVoted: false });
    showToast("Voter registered!");
  } else {
    // Edit existing
    const voter = state.voters.find(v => v.id === oldId);
    if (voter) { voter.id = newId; voter.name = name; }
    showToast("Voter updated!");
  }

  saveState();
  renderVotersList();
  resetVoterForm();
}

function editVoter(i) {
  const v = state.voters[i];
  document.getElementById("new-voter-id").value   = v.id;
  document.getElementById("new-voter-name").value = v.name;
  document.getElementById("voter-edit-old-id").value = v.id;
  document.getElementById("voter-form-title").textContent = "Edit Voter";
  document.getElementById("new-voter-id").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteVoter(i) {
  const v = state.voters[i];
  if (!confirm(`Remove voter "${v.name}" (${v.id})?`)) return;
  state.voters.splice(i, 1);
  saveState();
  renderVotersList();
  showToast("Voter removed.");
}

function resetVoterForm() {
  document.getElementById("new-voter-id").value = "";
  document.getElementById("new-voter-name").value = "";
  document.getElementById("voter-edit-old-id").value = "";
  document.getElementById("voter-form-title").textContent = "Register Voter";
}

function cancelVoterEdit() { resetVoterForm(); }

// ── Toast ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2800);
}

// ── Util ──────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
