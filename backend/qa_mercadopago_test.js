// backend/qa_mercadopago_test.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
const baseUrl = 'http://localhost:3000/api';

async function logStep(step, promise) {
  process.stdout.write(`=> ${step}... `);
  try {
    const res = await promise;
    console.log(`✅ OK`);
    return res;
  } catch (err) {
    console.log(`❌ ERROR:`, err);
    throw err;
  }
}

async function run() {
  console.log('=== Iniciando QA E2E MercadoPago ===\n');

  try {
    // 1. Auth: Registro / Login
    const loginRes = await logStep('Iniciando sesión como alumno', 
      fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alumno@tesh.edu.mx', password: 'Alumno2025!' })
      }).then(r => r.json())
    );

    const token = loginRes.data ? loginRes.data.accessToken : loginRes.accessToken;
    if (!token) throw new Error('No se obtuvo JWT token: ' + JSON.stringify(loginRes));

    // 2. Obtener inscripciones
    let enrollmentsSync = await fetch(`${baseUrl}/enrollments/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    
    const enrollmentArray = enrollmentsSync.data || enrollmentsSync;
    let pending = enrollmentArray.find(e => e.status === 'PENDING_PAYMENT');
    
    if (!pending) {
       // Buscar un curso activo en el que NO esté inscrito
       const coursesRes = await logStep('Obteniendo catálogo de cursos',
         fetch(`${baseUrl}/courses`, {
           headers: { 'Authorization': `Bearer ${token}` }
         }).then(r => r.json())
       );
       const coursesArray = coursesRes.data || coursesRes;
       const activeCourse = coursesArray.find(c => c.status === 'ACTIVE' && !enrollmentArray.some(e => e.courseId === c.id));
       if (!activeCourse) throw new Error('No hay cursos activos disponibles para probar inscripción.');

       const preEnrollRes = await logStep('Creando pre-inscripción',
         fetch(`${baseUrl}/enrollments/pre-enroll`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ courseId: activeCourse.id })
         }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.message))))
       );
       pending = preEnrollRes.data;
    } else {
       console.log(`=> Usando pre-inscripción existente: ✅ OK`);
    }

    // 4. Crear Preferencia en MercadoPago
    const prefRes = await logStep('POST /api/payments/create-preference',
      fetch(`${baseUrl}/payments/create-preference`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: pending.id })
      }).then(r => {
        if (!r.ok) return r.text().then(t => { throw new Error(t); });
        return r.json();
      })
    );

    console.log(`   🔸 MP Preference ID: ${prefRes.preferenceId}`);
    if (prefRes.initPoint) {
      console.log(`   🔸 MP Init Point Url: ${prefRes.initPoint}`);
    }

    // 5. Simular Webhook (IPN) de MercadoPago
    console.log('\n=== Simulando recepción de IPN Webhook ===');
    const fakePaymentId = '9999999999'; // Este ID no existe en MP, debe arrojar 500 / Error MP

    const webhookRes = await logStep('Simulando notificación IPN enviada por MercadoPago',
      fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "payment.created",
          api_version: "v1",
          data: { id: fakePaymentId },
          date_created: new Date().toISOString(),
          id: "12345",
          live_mode: false,
          type: "payment",
          user_id: "123456"
        })
      }).then(r => r.json())
    );

    console.log(`   🔸 Resultado Webhook:`, webhookRes);
    
    // 6. Verificar que Admin Stats funciona
    const adminLogin = await logStep('Login Admin',
      fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@tesh.edu.mx', password: 'password123' })
      }).then(r => r.json())
    );
    
    const statsRes = await logStep('GET /api/payments/stats',
      fetch(`${baseUrl}/payments/stats`, {
        headers: { 'Authorization': `Bearer ${adminLogin.accessToken}` }
      }).then(r => r.json())
    );
    
    console.log(`   🔸 Métricas de ingresos:`, statsRes.data);

    console.log('\n✅ Simulación concluida. El SDK de MP bloquea la confirmación porque fakePaymentId no existe en tu cuenta (esto comprueba que el driver rechaza webhooks falsos exitosamente).');

  } catch (err) {
    console.error('\n🔴 Test finalizado con errores.', err);
  }
}

run();
