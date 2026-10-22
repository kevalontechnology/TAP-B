import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { DigitalProfile } from '../src/models/DigitalProfile.js';
import { VisitorLead } from '../src/models/VisitorLead.js';
import { ProfileAnalyticsEvent } from '../src/models/ProfileAnalyticsEvent.js';

describe('Tapzy Customer Mobile & Backend API Test Suite', () => {
  let customerToken = '';
  let customerId = '';
  let secondCustomerToken = '';
  let testProfileId = '';
  const testUsername = `tapzy_user_${Date.now()}`;

  before(async () => {
    process.env.USE_IN_MEMORY_DB = 'true';
    await connectDB();

    // Clean up test data
    await User.deleteMany({ email: /@tapzytest\.com$/i });
  });

  after(async () => {
    await DigitalProfile.deleteMany({ username: testUsername });
    await User.deleteMany({ email: /@tapzytest\.com$/i });
    await disconnectDB();
  });

  test('1. Customer Registration & Token Generation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Rahul Sharma',
        email: `rahul_${Date.now()}@tapzytest.com`,
        password: 'Password@123',
        phone: '+919876543210',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.name, 'Rahul Sharma');
    assert.equal(res.body.user.role, 'CUSTOMER');

    customerToken = res.body.token;
    customerId = res.body.user.id;
  });

  test('2. Second Customer Registration for Isolation Tests', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Priya Patel',
        email: `priya_${Date.now()}@tapzytest.com`,
        password: 'Password@123',
      });

    assert.equal(res.status, 201);
    secondCustomerToken = res.body.token;
  });

  test('3. Create Customer Digital Business Profile', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fullName: 'Rahul Sharma',
        username: testUsername,
        designation: 'Senior Product Architect',
        bio: 'Designing cutting-edge NFC & digital card solutions at Kevalon.',
        mobileNumber: '+919876543210',
        whatsappNumber: '+919876543210',
        email1: 'rahul@kevalon.in',
        companyName: 'Kevalon Technology',
        companyWebsite: 'https://kevalon.com',
        industry: 'Information Technology',
        linkedIn: 'https://linkedin.com/in/rahulsharma',
        instagram: 'https://instagram.com/rahulsharma',
        customLinks: [
          {
            id: 'portfolio-1',
            label: 'My Portfolio',
            url: 'https://rahul.design',
            platform: 'portfolio',
          },
        ],
        themeColor: '#034665',
        isPublic: true,
        isActive: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.username, testUsername);
    assert.ok(res.body.data.publicUrl);
    testProfileId = res.body.data._id;
  });

  test('4. IDOR Protection: User Cannot Update Another Customer Profile', async () => {
    const res = await request(app)
      .put(`/api/profiles/${testProfileId}`)
      .set('Authorization', `Bearer ${secondCustomerToken}`)
      .send({
        fullName: 'Hacked Name',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('5. Public Profile Data Resolution Endpoint', async () => {
    const res = await request(app).get(`/api/public/profile/${testUsername}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.fullName, 'Rahul Sharma');
    assert.equal(res.body.data.themeColor, '#034665');
  });

  test('6. Record Profile View Interaction', async () => {
    const res = await request(app)
      .post(`/api/public/profile/${testUsername}/track-view`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
      .send({ referralSource: 'qr_scan' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.recorded, true);
  });

  test('7. Tracked Social Link Click & 302 Redirection', async () => {
    const res = await request(app)
      .get(`/t/link/${testProfileId}/instagram?src=nfc_tap`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');

    assert.equal(res.status, 302);
    assert.equal(res.headers.location, 'https://instagram.com/rahulsharma');
  });

  test('8. Consent-based Visitor Lead Submission', async () => {
    const res = await request(app)
      .post(`/api/public/profile/${testUsername}/connect`)
      .send({
        fullName: 'Vikram Mehta',
        email: 'vikram@enterprise.com',
        phoneNumber: '+919123456789',
        companyName: 'Mehta Global',
        designation: 'VP of Technology',
        interestedService: 'NFC Cards for 500 Employees',
        message: 'Looking for a bulk deployment quote.',
        consentGiven: true,
        source: 'qr_code',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
  });

  test('9. Profile Owner Can Retrieve Consented Leads', async () => {
    const res = await request(app)
      .get(`/api/profiles/${testProfileId}/leads`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.leads.length >= 1);
    assert.equal(res.body.data.leads[0].fullName, 'Vikram Mehta');
  });

  test('10. Profile Statistics Aggregation with Time Series', async () => {
    const res = await request(app)
      .get(`/api/profiles/${testProfileId}/statistics?range=30d`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.overview.totalViews >= 1);
    assert.ok(res.body.data.overview.totalClicks >= 1);
    assert.ok(res.body.data.overview.totalLeads >= 1);
    assert.ok(Array.isArray(res.body.data.chartTimeline));
  });

  test('11. Dedicated Social Media Link Statistics', async () => {
    const res = await request(app)
      .get(`/api/profiles/${testProfileId}/links/instagram/statistics`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.platform, 'instagram');
    assert.ok(res.body.data.metrics.totalClicks >= 1);
    assert.ok(res.body.data.measurementNote);
  });

  test('12. Reset Statistics Baseline (Safe Reporting Period Reset)', async () => {
    const resetRes = await request(app)
      .post(`/api/profiles/${testProfileId}/reset-stats`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);
    assert.ok(resetRes.body.statsResetBaseline);

    // After reset, leads still exist safely!
    const leadsRes = await request(app)
      .get(`/api/profiles/${testProfileId}/leads`)
      .set('Authorization', `Bearer ${customerToken}`);
    assert.ok(leadsRes.body.data.leads.length >= 1);
  });

  test('13. VCF Contact vCard Generation', async () => {
    const res = await request(app)
      .get(`/api/profiles/${testProfileId}/vcf?format=json`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.vcard.includes('BEGIN:VCARD'));
    assert.ok(res.body.data.vcard.includes('FN:Rahul Sharma'));
  });

  test('14. High-Resolution QR Code Endpoint', async () => {
    const res = await request(app)
      .get(`/api/profiles/${testProfileId}/qr`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.qrDataUrl.startsWith('data:image/png;base64,'));
  });
});
