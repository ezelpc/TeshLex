const baseUrl = 'http://localhost:3000/api';

async function req(method, path, body = null, token = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  
  return { status: res.status, data: json };
}

async function runTests() {
  const results = [];
  function assert(condition, testName, message) {
    if (condition) {
      console.log(`✅ ${testName}`);
      results.push({ test: testName, pass: true });
    } else {
      console.error(`❌ ${testName}: ${message}`);
      results.push({ test: testName, pass: false, error: message });
    }
  }

  console.log('--- TC-AUTH-001: Login exitoso por rol ---');
  let adminTokens, studentTokens, teacherTokens;
  
  let res = await req('POST', '/auth/login', { email: 'admin@tesh.edu.mx', password: 'Admin2025!' });
  assert(res.status === 200 && res.data.success, 'Login ADMIN status 200', JSON.stringify(res.data));
  if (res.status === 200) {
    adminTokens = res.data.data;
    assert(adminTokens.accessToken && adminTokens.user.role === 'ADMIN', 'Admin response structure correct', '');
    assert(adminTokens.user.password === undefined, 'Admin password absent', '');
  }

  res = await req('POST', '/auth/login', { email: 'alumno@tesh.edu.mx', password: 'Alumno2025!' });
  assert(res.status === 200 && res.data?.data?.user?.role === 'STUDENT', 'Login STUDENT status 200', '');
  if(res.status === 200) studentTokens = res.data.data;

  res = await req('POST', '/auth/login', { email: 'ana.garcia@tesh.edu.mx', password: 'Profesor2025!' });
  assert(res.status === 200 && res.data?.data?.user?.role === 'TEACHER', 'Login TEACHER status 200', '');
  if(res.status === 200) teacherTokens = res.data.data;

  console.log('\n--- TC-AUTH-002: Login fallido ---');
  res = await req('POST', '/auth/login', { email: 'admin@tesh.edu.mx', password: 'WrongPassword!' });
  assert(res.status === 401 && res.data.message === 'Credenciales incorrectas', 'Wrong password returns 401 Credenciales incorrectas', JSON.stringify(res.data));

  res = await req('POST', '/auth/login', { email: 'noexiste@tesh.edu.mx', password: 'Password123!' });
  assert(res.status === 401 && res.data.message === 'Credenciales incorrectas', 'Non-existent email returns same 401 message', JSON.stringify(res.data));

  res = await req('POST', '/auth/login', { email: '', password: 'Password123!' });
  assert(res.status === 400, 'Empty email returns 400', JSON.stringify(res.data));

  res = await req('POST', '/auth/login', { email: 'not-an-email', password: 'Password!@3' });
  assert(res.status === 400, 'Invalid email format returns 400', '');

  res = await req('POST', '/auth/login', { email: 'admin@tesh.edu.mx', password: 'short' });
  assert(res.status === 400, 'Short password returns 400', JSON.stringify(res.data));

  console.log('\n--- TC-AUTH-003: Refresh token ---');
  let newAdminTokens;
  if(adminTokens?.refreshToken) {
    res = await req('POST', '/auth/refresh', { refreshToken: adminTokens.refreshToken });
    assert(res.status === 200 && res.data.data?.accessToken, 'Valid refresh token returns new tokens', JSON.stringify(res.data));
    newAdminTokens = res.data.data;

    res = await req('POST', '/auth/refresh', { refreshToken: adminTokens.refreshToken });
    assert(res.status === 401, 'Reused refresh token returns 401', JSON.stringify(res.data));
  } else {
    assert(false, 'Cannot test refresh, login failed', '');
  }

  res = await req('POST', '/auth/refresh', { refreshToken: 'faketoken' });
  assert(res.status === 401, 'Fake refresh token returns 401', '');

  res = await req('POST', '/auth/refresh', { refreshToken: '' });
  assert(res.status === 400, 'Empty refresh token returns 400', '');

  console.log('\n--- TC-AUTH-004: Logout ---');
  if(studentTokens) {
    res = await req('POST', '/auth/logout', { refreshToken: studentTokens.refreshToken }, studentTokens.accessToken);
    assert(res.status === 200, 'Logout successful', JSON.stringify(res.data));

    res = await req('POST', '/auth/refresh', { refreshToken: studentTokens.refreshToken });
    assert(res.status === 401, 'Refresh token revoked after logout', JSON.stringify(res.data));
  } else {
    assert(false, 'Cannot test logout, student login failed', '');
  }

  console.log('\n--- TC-AUTH-005: GET /api/auth/me ---');
  if(newAdminTokens) { // Using admin because student logged out
    res = await req('GET', '/auth/me', null, newAdminTokens.accessToken);
    assert(res.status === 200 && res.data.data?.email, '/auth/me successful with valid token', JSON.stringify(res.data));
  }
  
  if(teacherTokens) {
    res = await req('GET', '/auth/me', null, teacherTokens.accessToken);
    assert(res.status === 200 && res.data.data?.teacherProfile !== undefined, '/auth/me returns teacherProfile', '');
  }

  res = await req('GET', '/auth/me', null, null);
  assert(res.status === 401, '/auth/me without token returns 401', '');

  res = await req('GET', '/auth/me', null, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  assert(res.status === 401, '/auth/me with invalid/expired token returns 401', '');

  console.log('\n--- TC-AUTH-006: Cambio de contraseña ---');
  // Re-login student to change password
  res = await req('POST', '/auth/login', { email: 'alumno@tesh.edu.mx', password: 'Alumno2025!' });
  if (res.status === 200) {
    const tmpStudentTokens = res.data.data;
    res = await req('POST', '/auth/change-password', { currentPassword: 'Alumno2025!', newPassword: 'NewAlumno2025!' }, tmpStudentTokens.accessToken);
    assert(res.status === 200, 'Password changed successfully', JSON.stringify(res.data));

    res = await req('POST', '/auth/refresh', { refreshToken: tmpStudentTokens.refreshToken });
    assert(res.status === 401, 'Old sessions revoked after password change', '');

    res = await req('POST', '/auth/login', { email: 'alumno@tesh.edu.mx', password: 'NewAlumno2025!' });
    assert(res.status === 200, 'Login works with new password', JSON.stringify(res.data));
    const tmpStudentTokens2 = res.data?.data;

    res = await req('POST', '/auth/change-password', { currentPassword: 'AlumnoWrong', newPassword: 'NewPassword!' }, tmpStudentTokens2?.accessToken);
    assert(res.status === 400, 'Change pwd with wrong current returns 400', JSON.stringify(res.data));

    res = await req('POST', '/auth/change-password', { currentPassword: 'NewAlumno2025!', newPassword: 'NewAlumno2025!' }, tmpStudentTokens2?.accessToken);
    assert(res.status === 400, 'Change pwd to same password returns 400', JSON.stringify(res.data));
    
    // Revert password to avoid breaking other tests
    await req('POST', '/auth/change-password', { currentPassword: 'NewAlumno2025!', newPassword: 'Alumno2025!' }, tmpStudentTokens2?.accessToken);
  } else {
    assert(false, 'TC-AUTH-006 setup failed', JSON.stringify(res.data));
  }

  console.log('\n--- TC-AUTH-007: Cuenta desactivada ---');
  // Register inactive user
  let inactiveEmail = `inactive${Date.now()}@tesh.edu.mx`;
  res = await req('POST', '/users/register', { 
    email: inactiveEmail, 
    password: 'Password123!', 
    firstName: 'Inactive', 
    lastName: 'User', 
    matricula: 'IN' + Math.floor(Math.random()*100000), 
    career: 'ISC', 
    semester: 1 
  });
  
  if (res.status === 201) {
    const newUserId = res.data.data.id;
    // Admin deactivate
    const deactivateRes = await req('PATCH', `/users/${newUserId}`, { isActive: false }, newAdminTokens.accessToken);
    assert(deactivateRes.status === 200, 'Admin deactivated account', JSON.stringify(deactivateRes.data));

    res = await req('POST', '/auth/login', { email: inactiveEmail, password: 'Password123!' });
    assert(res.status === 401 && res.data?.message?.includes('desactivada'), 'Inactive account login fails properly', JSON.stringify(res.data));
  } else {
    assert(false, 'TC-AUTH-007 setup failed (could not register)', JSON.stringify(res.data));
  }

  console.log('\n=== SUMMARY ===');
  const passes = results.filter(r => r.pass).length;
  console.log(`Passed: ${passes}/${results.length}`);
  
  if (passes < results.length) {
    console.error('FAILURES:');
    results.filter(r => !r.pass).forEach(f => console.error(f));
  }
}

runTests().catch(console.error);
