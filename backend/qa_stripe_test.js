// backend/qa_stripe_test.js
const { execSync } = require('child_process');
const Stripe = require('stripe');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const baseUrl = 'http://localhost:3000/api';
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mockkey';
const stripe = new Stripe(stripeKey);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mockkey';

async function req(method, path, body = null, token = null, customHeaders = {}) {
  const headers = { ...customHeaders };
  if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const payload = (body && typeof body !== 'string' && !Buffer.isBuffer(body)) 
    ? JSON.stringify(body) 
    : body;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: payload,
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

  console.log('--- QA STRIPE PAYMENTS E2E ---');

  // 1. Obtener Token de Alumno (Semilla)
  const loginRes = await req('POST', '/auth/login', { email: 'alumno@tesh.edu.mx', password: 'Alumno2025!' });
  assert(loginRes.status === 200, 'Login Alumno exitoso', '');
  const studentToken = loginRes.data.data.accessToken;

  // 2. Localizar un Curso Activo
  const coursesRes = await req('GET', '/courses?status=ACTIVE', null, studentToken);
  assert(coursesRes.status === 200 && coursesRes.data.data.length > 0, 'Obtener cursos activos', '');
  const testCourse = coursesRes.data.data[0];

  // 3. Pre-inscribirse al Curso
  const preEnrollRes = await req('POST', '/enrollments/pre-enroll', { courseId: testCourse.id }, studentToken);
  
  // Accept 201 or 409 if already enrolled
  let enrollmentId;
  if (preEnrollRes.status === 201) {
    enrollmentId = preEnrollRes.data.data.id;
    assert(true, 'Pre-inscripción creada (201)', '');
  } else if (preEnrollRes.status === 409) {
    // Already enrolled, find it
    const myEnrollments = await req('GET', '/enrollments/my', null, studentToken);
    const pending = myEnrollments.data.data.find(e => e.courseId === testCourse.id);
    if (pending) {
      enrollmentId = pending.id;
      assert(true, 'Obtenida pre-inscripción pendiente existente', '');
    } else {
      assert(false, 'No se pudo crear ni obtener inscripción', JSON.stringify(myEnrollments.data));
      return;
    }
  } else {
    assert(false, 'Error en pre-inscripción', JSON.stringify(preEnrollRes.data));
    return;
  }

  // 4. Crear Payment Intent (Paso 1 del flow de Stripe)
  const intentRes = await req('POST', '/payments/create-intent', { enrollmentId }, studentToken);
  assert(intentRes.status === 201 && intentRes.data.clientSecret, 'Create PaymentIntent exitoso (retorna secret)', JSON.stringify(intentRes.data));
  const paymentIntentId = intentRes.data.paymentIntentId;

  // 5. Simular Webhook (Paso 2 del flow de Stripe)
  const payload = {
    id: 'evt_test_webhook',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 150000,
        currency: 'mxn',
        status: 'succeeded',
        metadata: { enrollmentId }
      }
    }
  };

  const payloadString = JSON.stringify(payload, null, 2);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret: webhookSecret,
  });

  const webhookRes = await req('POST', '/payments/webhook', payloadString, null, {
    'stripe-signature': signature,
    'Content-Type': 'application/json'
  });

  assert(webhookRes.status === 200, 'Webhook procesado y acepta la firma', JSON.stringify(webhookRes.data));
  assert(webhookRes.data.status === 'APPROVED', 'Webhook devuelve status: APPROVED', '');

  // 6. Verificar que la inscripción ahora es ACTIVE
  const checkEnrollRes = await req('GET', `/enrollments/${enrollmentId}`, null, studentToken);
  assert(checkEnrollRes.status === 200 && checkEnrollRes.data.data.status === 'ACTIVE', 'Estado de la inscripción ahora es ACTIVE', JSON.stringify(checkEnrollRes.data));


  // RESUMEN
  console.log('\n=== STRIPE QA SUMMARY ===');
  const passes = results.filter(r => r.pass).length;
  console.log(`Passed: ${passes}/${results.length}`);
  
  if (passes < results.length) {
    console.error('FAILURES:');
    results.filter(r => !r.pass).forEach(f => console.error(f));
    process.exit(1);
  } else {
    console.log('Todos los flujos de pago e integración del Webhook pasaron QA.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
