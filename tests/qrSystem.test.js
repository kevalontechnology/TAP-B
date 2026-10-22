import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { QRCode } from '../src/models/QRCode.js';
import { QRScanLog } from '../src/models/QRScanLog.js';

describe('Dynamic QR Code Management System - Full Test Suite', () => {
  let adminToken = '';
  let staffToken = '';

  before(async () => {
    // Set environment flag to use in-memory DB for tests
    process.env.USE_IN_MEMORY_DB = 'true';
    await connectDB();

    // 1. Authenticate as seeded Super Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@tapzy.in', password: 'Admin@123456' });

    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.success, true);
    assert.ok(adminRes.body.token);
    adminToken = adminRes.body.token;

    // 2. Authenticate as seeded Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@tapzy.in', password: 'Staff@123456' });

    assert.equal(staffRes.status, 200);
    staffToken = staffRes.body.token;
  });

  after(async () => {
    await disconnectDB();
  });

  test('1. Admin Authentication & RBAC Me Endpoint', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'admin@tapzy.in');
    assert.equal(res.body.user.role, 'SUPER_ADMIN');
  });

  test('2. Generate Single QR Code (Unassigned)', async () => {
    const res = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Tapzy Standee 01',
        description: 'Test Standee at Reception',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.publicCode);
    assert.equal(res.body.data.status, 'UNASSIGNED');
    assert.ok(res.body.data.shortUrl.includes(res.body.data.publicCode));
  });

  test('3. Scan Unassigned QR Code (Should return branded unassigned status page)', async () => {
    // First create unassigned QR
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Unassigned Test Tag' });

    const publicCode = createRes.body.data.publicCode;

    // Scan via GET /q/:publicCode
    const scanRes = await request(app).get(`/q/${publicCode}`);
    assert.equal(scanRes.status, 200);
    assert.ok(scanRes.text.includes('QR Code Not Assigned'));
    assert.ok(scanRes.headers['cache-control'].includes('no-store'));
  });

  test('4. Assign QR Code to Customer and Verify Active Status', async () => {
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Customer Card Tag' });

    const qrId = createRes.body.data._id;
    const publicCode = createRes.body.data.publicCode;

    // Assign to Harsh
    const assignRes = await request(app)
      .patch(`/api/qr/${qrId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Harsh Vardhan',
        customerRefId: 'CUST-1092',
        destinationType: 'WEBSITE',
        destinationUrl: 'https://tapzy.in/harsh',
      });

    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.body.data.status, 'ACTIVE');
    assert.equal(assignRes.body.data.destinationUrl, 'https://tapzy.in/harsh');

    // Now scanning must return 302 redirect to assigned destination
    const scanRes = await request(app).get(`/q/${publicCode}`);
    assert.equal(scanRes.status, 302);
    assert.equal(scanRes.headers.location, 'https://tapzy.in/harsh');
    assert.ok(scanRes.headers['cache-control'].includes('no-store'));
  });

  test('5. CRITICAL TEST: Generate QR, Scan, Update Destination, Scan Exact Same QR Again', async () => {
    // Step A: Create and assign QR with Initial Destination
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Dual-Scan Dynamic Verification Tag',
        destinationType: 'WEBSITE',
        destinationUrl: 'https://tapzy.in/harsh',
      });

    assert.equal(createRes.status, 201);
    const qrId = createRes.body.data._id;
    const publicCode = createRes.body.data.publicCode;
    const shortUrl = createRes.body.data.shortUrl;

    // Step B: First Scan - must open initially assigned destination (https://tapzy.in/harsh)
    const firstScan = await request(app).get(`/q/${publicCode}`);
    assert.equal(firstScan.status, 302);
    assert.equal(firstScan.headers.location, 'https://tapzy.in/harsh');
    assert.ok(firstScan.headers['cache-control'].includes('no-store'));

    // Step C: Admin updates destination to https://kevalontechnology.in
    const updateRes = await request(app)
      .patch(`/api/qr/${qrId}/destination`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destinationType: 'WEBSITE',
        destinationUrl: 'https://kevalontechnology.in',
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.destinationUrl, 'https://kevalontechnology.in');

    // The physical QR code / short URL must remain identical!
    assert.equal(updateRes.body.data.publicCode, publicCode);
    assert.equal(updateRes.body.data.shortUrl, shortUrl);

    // Step D: Second Scan of the EXACT SAME QR Code must open the updated destination!
    const secondScan = await request(app).get(`/q/${publicCode}`);
    assert.equal(secondScan.status, 302);
    assert.equal(secondScan.headers.location, 'https://kevalontechnology.in');
    assert.ok(secondScan.headers['cache-control'].includes('no-store'));

    // Verify scan count incremented in DB
    const qrInDb = await QRCode.findById(qrId);
    assert.equal(qrInDb.scanCount, 2);
  });

  test('6. Unsafe Destination Rejection (Localhost, Private IP, JS Scheme)', async () => {
    // Attempt localhost
    const resLocalhost = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Malicious QR',
        destinationUrl: 'http://localhost:8080/admin',
      });
    assert.equal(resLocalhost.status, 400);

    // Attempt 127.0.0.1
    const resLoopback = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Malicious Loopback',
        destinationUrl: 'http://127.0.0.1:3000/keys',
      });
    assert.equal(resLoopback.status, 400);

    // Attempt private RFC1918 IP
    const resPrivate = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Private IP',
        destinationUrl: 'http://192.168.1.1/router',
      });
    assert.equal(resPrivate.status, 400);

    // Attempt javascript: scheme
    const resJs = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'XSS attempt',
        destinationUrl: 'javascript:alert(1)',
      });
    assert.equal(resJs.status, 400);
  });

  test('7. QR Code Enable / Disable Status Toggle', async () => {
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Toggle Test Tag',
        destinationUrl: 'https://example.com',
      });

    const qrId = createRes.body.data._id;
    const publicCode = createRes.body.data.publicCode;

    // Disable QR
    const disableRes = await request(app)
      .patch(`/api/qr/${qrId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISABLED' });

    assert.equal(disableRes.status, 200);
    assert.equal(disableRes.body.data.status, 'DISABLED');

    // Scan should now return branded disabled status page (HTTP 200)
    const scanDisabled = await request(app).get(`/q/${publicCode}`);
    assert.equal(scanDisabled.status, 200);
    assert.ok(scanDisabled.text.includes('QR Code Disabled'));

    // Re-enable QR
    const enableRes = await request(app)
      .patch(`/api/qr/${qrId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    assert.equal(enableRes.status, 200);
    assert.equal(enableRes.body.data.status, 'ACTIVE');

    // Scan should redirect again
    const scanActive = await request(app).get(`/q/${publicCode}`);
    assert.equal(scanActive.status, 302);
    assert.equal(scanActive.headers.location, 'https://example.com');
  });

  test('8. QR Code Expiration Validation', async () => {
    // Create an already-expired QR code
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Expired Promo Tag',
        destinationUrl: 'https://example.com/promo',
        expiresAt: yesterday,
      });

    const publicCode = createRes.body.data.publicCode;

    // Scan must show expired status page
    const scanRes = await request(app).get(`/q/${publicCode}`);
    assert.equal(scanRes.status, 200);
    assert.ok(scanRes.text.includes('QR Code Expired'));
  });

  test('9. Bulk QR Generation Engine & Batch Integrity', async () => {
    const bulkRes = await request(app)
      .post('/api/qr/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        batchName: 'Tapzy Bulk Test 001',
        quantity: 50,
      });

    assert.equal(bulkRes.status, 201);
    assert.equal(bulkRes.body.success, true);
    const batchId = bulkRes.body.data.batchId;
    assert.ok(batchId);

    // Verify 50 QR codes created in MongoDB with this batchId
    const count = await QRCode.countDocuments({ batchId });
    assert.equal(count, 50);

    // Verify batch CSV export works
    const csvRes = await request(app)
      .get(`/api/qr/batches/${batchId}/csv`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Public Code'));
  });

  test('10. PNG & SVG Download Endpoints', async () => {
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Download Test Tag' });

    const qrId = createRes.body.data._id;

    // Download PNG
    const pngRes = await request(app)
      .get(`/api/qr/${qrId}/download?format=png`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(pngRes.status, 200);
    assert.equal(pngRes.headers['content-type'], 'image/png');
    assert.ok(pngRes.body.length > 100);

    // Download SVG
    const svgRes = await request(app)
      .get(`/api/qr/${qrId}/download?format=svg`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(svgRes.status, 200);
    assert.ok(svgRes.headers['content-type'].includes('image/svg+xml'));
    const svgContent = svgRes.text || (svgRes.body ? svgRes.body.toString() : '');
    assert.ok(svgContent.includes('<svg'));
  });

  test('11. Scan Analytics Dashboard Aggregation', async () => {
    const dashRes = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(dashRes.status, 200);
    assert.equal(dashRes.body.success, true);
    assert.ok(dashRes.body.data.metrics.totalQr > 0);
    assert.ok(Array.isArray(dashRes.body.data.dailyTrend));
    assert.ok(Array.isArray(dashRes.body.data.deviceStats));
  });

  test('12. Audit History Tracking', async () => {
    const createRes = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Audit Test Tag' });

    const qrId = createRes.body.data._id;

    // Update destination
    await request(app)
      .patch(`/api/qr/${qrId}/destination`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ destinationUrl: 'https://google.com' });

    const historyRes = await request(app)
      .get(`/api/qr/${qrId}/history`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.body.data.length >= 2);
    const actions = historyRes.body.data.map((h) => h.action);
    assert.ok(actions.includes('CREATED'));
    assert.ok(actions.includes('DESTINATION_UPDATED'));
  });
});
