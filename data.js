/* Simulated database using browser LocalStorage */
const DB = {
  get(k) { return JSON.parse(localStorage.getItem(k) || 'null'); },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  nextId(k) { return Math.max(0, ...this.get(k).map(x => x.id)) + 1; }
};
(function seed() {
  if (DB.get('seeded')) return;
  const d = new Date().toISOString().slice(0, 10);
  DB.set('users', [
    { u: 'admin', p: 'admin123', role: 'admin', name: 'Admin' },
    { u: 'rec', p: 'rec123', role: 'reception', name: 'Meena (Reception)' },
    { u: 'drsaini', p: 'doc123', role: 'doctor', name: 'Dr. A Saini', docId: 1 },
    { u: 'rahul', p: 'pat123', role: 'patient', name: 'Rahul Verma', patId: 1 }
  ]);
  DB.set('doctors', [
    { id: 1, name: 'Dr. A Saini', dept: 'General Medicine' },
    { id: 2, name: 'Dr. A. Khan', dept: 'Orthopedics' },
    { id: 3, name: 'Dr. S. Rao', dept: 'Cardiology' }
  ]);
  DB.set('patients', [
    { id: 1, name: 'Rahul Verma', age: 24, gender: 'Male', phone: '9876543210' },
    { id: 2, name: 'Priya Singh', age: 31, gender: 'Female', phone: '9123456780' }
  ]);
  DB.set('staff', [
  {
    id: 1,
    name: 'Amit Kumar',
    role: 'Nurse',
    department: 'General Ward',
    phone: '9876543210'
  },
  {
    id: 2,
    name: 'Neha Sharma',
    role: 'Receptionist',
    department: 'Reception',
    phone: '9123456780'
  }
]);
  DB.set('appointments', [{ id: 1, pid: 1, did: 1, date: d, slot: '10:00 AM', status: 'Booked' }]);
  DB.set('bills', [{ id: 1, pid: 1, consult: 500, tests: 300, meds: 0, total: 800, status: 'Pending', date: d }]);
  const beds = [];
  for (let i = 1; i <= 8; i++) beds.push({ id: i, ward: i <= 6 ? 'General' : 'ICU', pid: null });
  DB.set('beds', beds);
  DB.set('seeded', true);
})();
