const user = JSON.parse(sessionStorage.getItem('user') || 'null');
if (!user) location.replace('index.html');
const MENU = { admin: ['overview', 'patients', 'appointments', 'billing', 'beds', 'staff'], reception: ['patients', 'appointments', 'billing', 'beds'], doctor: ['overview', 'appointments', 'patients'], patient: ['appointments', 'billing'] };
const LABEL = { overview: 'Overview', patients: 'Patients', appointments: 'Appointments', billing: 'Billing', beds: 'Beds & wards', staff: 'Staff' };
const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
const staff = ['admin', 'reception'].includes(user.role);
const today = new Date().toISOString().slice(0, 10);
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nm = (list, id) => (DB.get(list).find(x => x.id == id) || {}).name || '—';
const opts = l => DB.get(l).map(x => `<option value="${x.id}">${esc(x.name)}${x.dept ? ' – ' + esc(x.dept) : ''}</option>`).join('');
const table = (head, rows) => rows.length ? `<div class="tbl"><table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>` : '<p class="empty">Nothing here yet.</p>';
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }
function logout() { sessionStorage.removeItem('user'); location.href = 'index.html'; }

let cur = MENU[user.role][0];
function go(v) {
  cur = v;
  $('#nav').innerHTML = MENU[user.role].map(m => `<button class="${m === cur ? 'on' : ''}" onclick="go('${m}')">${LABEL[m]}</button>`).join('');
  VIEWS[v]();
}
const myAppts = () => DB.get('appointments').filter(a => user.role === 'doctor' ? a.did == user.docId : user.role === 'patient' ? a.pid == user.patId : true);

const VIEWS = {
  overview() {
    const a = myAppts().filter(x => x.date === today && x.status === 'Booked').length;
    const pend = DB.get('bills').filter(b => b.status === 'Pending').reduce((s, b) => s + b.total, 0);
    const free = DB.get('beds').filter(b => !b.pid).length;
    const card = (n, l) => `<div class="stat"><b>${n}</b>${l}</div>`;
    $('#main').innerHTML = `<h2>Overview</h2><div class="stats">${card(DB.get('patients').length, 'Registered patients')}${card(a, "Today's appointments")}` +
      (user.role === 'admin' ? card('₹' + pend, 'Pending bills') + card(free + ' of ' + DB.get('beds').length, 'Beds free') : '') + '</div>';
  },
  patients() {
    $('#main').innerHTML = `<h2>Patients</h2>` + (staff ? `<form class="panel" onsubmit="addPatient(event)"><h3>Register patient</h3><div class="row">
      <label>Full name<input name="name" required></label><label>Age<input name="age" type="number" min="0" max="120" required></label>
      <label>Gender<select name="gender"><option>Male</option><option>Female</option><option>Other</option></select></label>
      <label>Phone<input name="phone" pattern="[0-9]{10}" title="Enter a 10-digit mobile number" required></label></div>
      <button class="btn">Register patient</button></form>` : '') +
      `<div class="panel"><label>Search<input placeholder="Name or phone" oninput="listPatients(this.value)"></label><div id="plist"></div></div>`;
    listPatients('');
  },
  appointments() {
    const form = user.role === 'doctor' ? '' : `<form class="panel" onsubmit="bookAppt(event)"><h3>Book appointment</h3><div class="row">` +
      (user.role === 'patient' ? '' : `<label>Patient<select name="pid">${opts('patients')}</select></label>`) +
      `<label>Doctor<select name="did">${opts('doctors')}</select></label><label>Date<input name="date" type="date" min="${today}" required></label>
      <label>Time<select name="slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></label></div><button class="btn">Book appointment</button></form>`;
    const rows = myAppts().map(a => [esc(nm('patients', a.pid)), esc(nm('doctors', a.did)), a.date, a.slot, `<span class="tag ${a.status}">${a.status}</span>`,
    a.status === 'Booked' ? (user.role === 'doctor' ? `<button class="btn sm" onclick="setAppt(${a.id},'Completed')">Mark done</button>` : `<button class="btn sm danger" onclick="setAppt(${a.id},'Cancelled')">Cancel</button>`) : '']);
    $('#main').innerHTML = `<h2>Appointments</h2>${form}<div class="panel">${table(['Patient', 'Doctor', 'Date', 'Time', 'Status', ''], rows)}</div>`;
  },
  billing() {
    const form = staff ? `<form class="panel" onsubmit="addBill(event)"><h3>Create bill</h3><div class="row"><label>Patient<select name="pid">${opts('patients')}</select></label>
      <label>Consultation (₹)<input name="consult" type="number" min="0" value="0"></label><label>Tests (₹)<input name="tests" type="number" min="0" value="0"></label>
      <label>Medicines (₹)<input name="meds" type="number" min="0" value="0"></label></div><button class="btn">Create bill</button></form>` : '';
    const rows = DB.get('bills').filter(b => user.role !== 'patient' || b.pid == user.patId).map(b => [b.id, esc(nm('patients', b.pid)), b.date, '₹' + b.total,
    `<span class="tag ${b.status}">${b.status}</span>`,
    (b.status === 'Pending' ? `<button class="btn sm" onclick="payBill(${b.id})">${staff ? 'Mark paid' : 'Pay now'}</button> ` : '') + `<button class="btn sm ghost" onclick="printBill(${b.id})">Print</button>`]);
    $('#main').innerHTML = `<h2>Billing</h2>${form}<div class="panel">${table(['Bill no.', 'Patient', 'Date', 'Total', 'Status', ''], rows)}</div>`;
  },
  beds() {
    const b = DB.get('beds');
    $('#main').innerHTML = `<h2>Beds & wards</h2><div class="panel"><label>Admit patient to a free bed<select id="admitPid">${opts('patients')}</select></label>
      <p class="empty">Select a patient, then click a green bed to admit. Click a red bed to discharge.</p>
      <div class="beds">${b.map(x => `<button class="bed ${x.pid ? 'busy' : ''}" onclick="toggleBed(${x.id})"><b>Bed ${x.id}</b><small>${x.ward}</small><small>${x.pid ? esc(nm('patients', x.pid)) : 'Free'}</small></button>`).join('')}</div></div>`;
  },
  staff() {
    const list = DB.get('staff') || [];

    const rows = list.map(s => [
      s.id,
      esc(s.name),
      esc(s.role),
      esc(s.department),
      esc(s.phone),
      `<button class="btn sm" onclick="editStaff(${s.id})">Edit</button>
     <button class="btn sm danger" onclick="deleteStaff(${s.id})">Delete</button>`
    ]);

    $('#main').innerHTML = `
    <h2>Staff Management</h2>

    <form class="panel" onsubmit="addStaff(event)">
      <h3>Add Staff</h3>
      <div class="row">
        <label>Full name
          <input name="name" required>
        </label>

        <label>Role
          <select name="role">
            <option>Nurse</option>
            <option>Receptionist</option>
            <option>Ward Staff</option>
            <option>Pharmacist</option>
            <option>Lab Technician</option>
          </select>
        </label>

        <label>Department
          <input name="department" required>
        </label>

        <label>Phone
          <input name="phone" pattern="[0-9]{10}" 
                 title="Enter a 10-digit mobile number" required>
        </label>
      </div>

      <button class="btn">Add Staff</button>
    </form>

    <div class="panel">
      ${table(
      ['ID', 'Name', 'Role', 'Department', 'Phone', 'Action'],
      rows
    )}
    </div>
  `;
  },
};

function listPatients(q) {
  q = q.toLowerCase();
  const rows = DB.get('patients').filter(p => p.name.toLowerCase().includes(q) || p.phone.includes(q)).map(p => [p.id, esc(p.name), p.age, p.gender, esc(p.phone)]);
  $('#plist').innerHTML = table(['ID', 'Name', 'Age', 'Gender', 'Phone'], rows);
}
function addPatient(e) {
  e.preventDefault(); const f = new FormData(e.target), l = DB.get('patients');
  l.push({ id: DB.nextId('patients'), name: f.get('name').trim(), age: +f.get('age'), gender: f.get('gender'), phone: f.get('phone') });
  DB.set('patients', l); toast('Patient registered'); go('patients');
}
function bookAppt(e) {
  e.preventDefault(); const f = new FormData(e.target), l = DB.get('appointments');
  const pid = user.role === 'patient' ? user.patId : +f.get('pid'), did = +f.get('did'), date = f.get('date'), slot = f.get('slot');
  if (l.some(a => a.did === did && a.date === date && a.slot === slot && a.status === 'Booked')) { toast('That slot is taken. Pick another time.'); return; }
  l.push({ id: DB.nextId('appointments'), pid, did, date, slot, status: 'Booked' });
  DB.set('appointments', l); toast('Appointment booked'); go('appointments');
}
function setAppt(id, s) { const l = DB.get('appointments'); l.find(a => a.id === id).status = s; DB.set('appointments', l); toast('Appointment ' + s.toLowerCase()); go('appointments'); }
function addBill(e) {
  e.preventDefault(); const f = new FormData(e.target), l = DB.get('bills');
  const consult = +f.get('consult'), tests = +f.get('tests'), meds = +f.get('meds');
  if (consult + tests + meds <= 0) { toast('Enter at least one charge.'); return; }
  l.push({ id: DB.nextId('bills'), pid: +f.get('pid'), consult, tests, meds, total: consult + tests + meds, status: 'Pending', date: today });
  DB.set('bills', l); toast('Bill created'); go('billing');
}
function payBill(id) { const l = DB.get('bills'); l.find(b => b.id === id).status = 'Paid'; DB.set('bills', l); toast('Payment recorded'); go('billing'); }
function printBill(id) {
  const b = DB.get('bills').find(x => x.id === id), w = window.open('', '_blank');
  w.document.write(`<body style="font-family:sans-serif;max-width:420px;margin:2rem auto"><h2>CityCare Hospital – Receipt #${b.id}</h2><p>Patient: ${esc(nm('patients', b.pid))}<br>Date: ${b.date}</p>
    <table width="100%" cellpadding="6"><tr><td>Consultation</td><td>₹${b.consult}</td></tr><tr><td>Tests</td><td>₹${b.tests}</td></tr><tr><td>Medicines</td><td>₹${b.meds}</td></tr>
    <tr><td><b>Total</b></td><td><b>₹${b.total}</b></td></tr></table><p>Status: ${b.status}</p><script>print()<\/script></body>`);
  w.document.close();
}
function toggleBed(id) {
  const l = DB.get('beds'), b = l.find(x => x.id === id);
  if (b.pid) { if (!confirm('Discharge ' + nm('patients', b.pid) + '?')) return; b.pid = null; toast('Patient discharged'); }
  else { b.pid = +$('#admitPid').value; toast('Patient admitted to bed ' + id); }
  DB.set('beds', l); go('beds');
}
function addStaff(e) {
  e.preventDefault();

  const f = new FormData(e.target);
  const list = DB.get('staff') || [];

  list.push({
    id: list.length ? Math.max(...list.map(s => s.id)) + 1 : 1,
    name: f.get('name').trim(),
    role: f.get('role'),
    department: f.get('department').trim(),
    phone: f.get('phone')
  });

  DB.set('staff', list);

  toast('Staff added successfully');
  go('staff');
}

function deleteStaff(id) {
  if (!confirm('Are you sure you want to delete this staff member?')) return;

  let list = DB.get('staff') || [];
  list = list.filter(s => s.id !== id);

  DB.set('staff', list);

  toast('Staff deleted');
  go('staff');
}


$('#who').textContent = user.name + ' · ' + user.role;
go(cur);
function editStaff(id) {
  const list = DB.get('staff') || [];
  const s = list.find(x => x.id === id);

  if (!s) return;

  const name = prompt('Enter staff name:', s.name);
  if (name === null) return;

  const phone = prompt('Enter phone:', s.phone);
  if (phone === null) return;

  s.name = name.trim();
  s.phone = phone.trim();

  DB.set('staff', list);

  toast('Staff updated');
  go('staff');
}
