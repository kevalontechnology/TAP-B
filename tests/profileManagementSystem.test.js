import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { DigitalProfile } from '../src/models/DigitalProfile.js';
import { SystemSetting } from '../src/models/SystemSetting.js';

describe('Tapzy Profile Management System – Complete Test Suite', async () => {
  let adminToken = '';
  let userAToken = '';
  let userBToken = '';
  let adminUser = null;
  let userA = null;
  let userB = null;
  let testProfileA = null;

  before(async () => {
    process.env.USE_IN_MEMORY_DB = 'true';
    await connectDB();

    // Clean test data
    await Promise.all([
      DigitalProfile.deleteMany({ username: { $in: ['test_user_a', 'test_user_b', 'admin_created_prof', 'dup_username_test'] } }),
      User.deleteMany({ email: { $in: ['test_user_a@tapzy.in', 'test_user_b@tapzy.in'] } }),
    ]);

    // Login Super Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@tapzy.in', password: 'Admin@123456' });

    assert.equal(adminLoginRes.status, 200);
    adminToken = adminLoginRes.body.token;
    adminUser = adminLoginRes.body.user;

    // Register User A
    const regARes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Alpha',
        email: 'test_user_a@tapzy.in',
        password: 'Password@123',
        phone: '+91 9988776655',
      });
    assert.equal(regARes.status, 201);
    userAToken = regARes.body.token;
    userA = regARes.body.user;

    // Register User B
    const regBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Beta',
        email: 'test_user_b@tapzy.in',
        password: 'Password@123',
        phone: '+91 9988776644',
      });
    assert.equal(regBRes.status, 201);
    userBToken = regBRes.body.token;
    userB = regBRes.body.user;
  });

  after(async () => {
    await Promise.all([
      DigitalProfile.deleteMany({ username: { $in: ['test_user_a', 'test_user_b', 'admin_created_prof', 'dup_username_test'] } }),
      User.deleteMany({ email: { $in: ['test_user_a@tapzy.in', 'test_user_b@tapzy.in'] } }),
    ]);
    await disconnectDB();
  });

  // 1. Admin Base URL Configuration
  await test('1. Admin Configures Profile Base URL', async () => {
    const updateRes = await request(app)
      .put('/api/admin/settings/profile-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ profileBaseUrl: 'https://profile.tapzy.in' });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.data.profileBaseUrl, 'https://profile.tapzy.in');

    const getRes = await request(app)
      .get('/api/admin/settings/profile-url')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.profileBaseUrl, 'https://profile.tapzy.in');
  });

  // 2. User Creates Profile (Backend automatically forces user ownership)
  await test('2. User A Creates Digital Profile with full fields', async () => {
    const payload = {
      fullName: 'Harsh Vardhan Kothari',
      username: 'test_user_a',
      designation: 'VP of Technology',
      bio: 'Leading smart digital transformation and dynamic QR systems.',
      mobileNumber: '+91 98765 43210',
      whatsappNumber: '+91 98765 43210',
      email1: 'harsh@tapzy.in',
      companyName: 'Tapzy Technologies',
      companyWebsite: 'https://tapzy.in',
      themeColor: '#034665',
      isPublic: true,
      isActive: true,
      services: [
        { id: 's1', title: 'Smart Cards', description: 'NFC smart business cards', price: '₹999' },
      ],
      products: [
        { id: 'p1', name: 'Tapzy Standee', price: '₹1499', description: 'Acrylic NFC Standee' },
      ],
      customLinks: [
        { id: 'l1', label: 'Schedule Meeting', url: 'https://calendly.com/tapzy' },
      ],
    };

    const res = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.username, 'test_user_a');
    assert.equal(res.body.data.publicUrl, 'https://profile.tapzy.in/test_user_a');
    testProfileA = res.body.data;
  });

  // 3. User Retrieves Own Profiles (Isolation)
  await test('3. User A sees only their own profiles via /api/profiles/my', async () => {
    const resA = await request(app)
      .get('/api/profiles/my')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(resA.status, 200);
    assert.equal(resA.body.success, true);
    assert.equal(resA.body.data.length, 1);
    assert.equal(resA.body.data[0].username, 'test_user_a');

    // User B must see 0 profiles
    const resB = await request(app)
      .get('/api/profiles/my')
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(resB.status, 200);
    assert.equal(resB.body.data.length, 0);
  });

  // 4. IDOR Protection
  await test('4. IDOR Protection: User B cannot modify or retrieve User A profile', async () => {
    // User B tries to retrieve User A's profile via /my/:id
    const getRes = await request(app)
      .get(`/api/profiles/my/${testProfileA._id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(getRes.status, 403);

    // User B tries to update User A's profile
    const putRes = await request(app)
      .put(`/api/profiles/${testProfileA._id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ fullName: 'Hacked Name' });

    assert.equal(putRes.status, 403);
  });

  // 5. Username Uniqueness Validation
  await test('5. Rejects Duplicate Username Across Users', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        fullName: 'User Beta Copy',
        username: 'test_user_a', // already taken by User A
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // 6. Admin Lists All Profiles with Search & Filters
  await test('6. Admin Lists All Profiles with Pagination and Populated Owner', async () => {
    const res = await request(app)
      .get('/api/admin/profiles?search=Harsh')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    const found = res.body.data.find((p) => p.username === 'test_user_a');
    assert.ok(found);
    assert.equal(found.userId.email, 'test_user_a@tapzy.in');
  });

  // 7. Admin Creates Profile for a Selected User
  await test('7. Admin Creates Profile for User B via Searchable Owner Selector', async () => {
    const userBId = userB.id || userB._id;
    const res = await request(app)
      .post('/api/admin/profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: userBId, // Assigned to User B
        fullName: 'Beta Admin Created',
        username: 'admin_created_prof',
        mobileNumber: '+91 91234 56789',
        companyName: 'Beta Corp',
        themeColor: '#0088cc',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.userId._id.toString(), userBId.toString());
    assert.equal(res.body.data.publicUrl, 'https://profile.tapzy.in/admin_created_prof');

    // Verify User B can now see this profile in their /my list
    const myRes = await request(app)
      .get('/api/profiles/my')
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(myRes.status, 200);
    assert.equal(myRes.body.data.length, 1);
    assert.equal(myRes.body.data[0].username, 'admin_created_prof');
  });

  // 8. Public Profile Resolution
  await test('8. Public Profile Resolution for Active & Public Profile', async () => {
    const res = await request(app).get('/api/public/profile/test_user_a');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.fullName, 'Harsh Vardhan Kothari');
    assert.equal(res.body.data.publicUrl, 'https://profile.tapzy.in/test_user_a');
  });

  // 9. Private / Inactive Profile Security
  await test('9. Private Profile Returns 403 on Public Endpoint', async () => {
    // User A sets profile to private
    await request(app)
      .put(`/api/profiles/${testProfileA._id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ isPublic: false });

    const pubRes = await request(app).get('/api/public/profile/test_user_a');
    assert.equal(pubRes.status, 403);
    assert.equal(pubRes.body.success, false);

    // Restore to public
    await request(app)
      .put(`/api/profiles/${testProfileA._id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ isPublic: true });
  });

  // 10. Public vCard Download
  await test('10. Public VCF Download returns valid vCard 3.0', async () => {
    const res = await request(app).get('/p/test_user_a/vcf');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('BEGIN:VCARD'));
    assert.ok(res.text.includes('FN:Harsh Vardhan Kothari'));
    assert.ok(res.text.includes('END:VCARD'));
  });
});
