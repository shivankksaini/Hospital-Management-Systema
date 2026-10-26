document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = username.value.trim(), p = password.value, r = role.value;
  const user = DB.get('users').find(x => x.u === u && x.p === p && x.role === r);
  if (!user) { err.textContent = 'Wrong username, password or role. Check and try again.'; return; }
  sessionStorage.setItem('user', JSON.stringify(user));
  location.href = 'dashboard.html';
});
