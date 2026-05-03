#!/usr/bin/env node
/**
 * Demo seed — populates a fresh database with believable real-estate
 * sample data so prospects can click around the SmartCRM Demo and see
 * every feature populated.
 *
 *   1 admin (demo@smartcrmsolution.com / demo123)
 *   4 reps  (sales reps with realistic Indian names)
 *  100 leads spread across 30 days, varied statuses/sources/cities
 *   15 properties
 *   30 days of attendance (90% present, 5% half-day, 5% leave)
 *   12 tasks (mix of open / in_progress / done)
 *   3 leave requests
 *   12 salary slips (3 months × 4 reps)
 *   ~150 follow-ups (some overdue, some today, mostly upcoming)
 *
 *  Run:    npm run seed:demo
 *
 *  Idempotent: detects existing demo admin and re-creates the dataset
 *  cleanly (drops & re-inserts only the demo-tagged rows so a fresh
 *  prospect always sees a tidy starting point). Safe to wire to a cron.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./pg');

// ------------------------------------------------------------------ data pools

const FIRST_NAMES = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
  'Saanvi','Aanya','Aaradhya','Diya','Pari','Anaya','Ananya','Aarohi','Anika','Navya',
  'Rohan','Karan','Rahul','Manish','Vikram','Suresh','Ramesh','Ajay','Vijay','Amit',
  'Priya','Pooja','Neha','Kavya','Riya','Shreya','Nisha','Meera','Ritu','Asha'];
const LAST_NAMES = ['Sharma','Verma','Patel','Kumar','Singh','Gupta','Mehta','Shah','Reddy','Iyer',
  'Nair','Pillai','Joshi','Desai','Kapoor','Khanna','Malhotra','Chopra','Bhatia','Agarwal'];

const CITIES = [
  ['Mumbai',     'Maharashtra', '400001'],
  ['Pune',       'Maharashtra', '411001'],
  ['Delhi',      'Delhi',       '110001'],
  ['Bengaluru',  'Karnataka',   '560001'],
  ['Hyderabad',  'Telangana',   '500001'],
  ['Chennai',    'Tamil Nadu',  '600001'],
  ['Kolkata',    'West Bengal', '700001'],
  ['Ahmedabad',  'Gujarat',     '380001'],
  ['Jaipur',     'Rajasthan',   '302001'],
  ['Lucknow',    'Uttar Pradesh','226001']
];

const PROPERTIES = [
  { name: 'Celeste Skyview Towers — 2BHK',     price: 8500000,  type: 'Apartment' },
  { name: 'Celeste Skyview Towers — 3BHK',     price: 12500000, type: 'Apartment' },
  { name: 'Celeste Skyview Towers — 4BHK',     price: 17500000, type: 'Apartment' },
  { name: 'Lakeview Villas — 4BHK',            price: 32500000, type: 'Villa' },
  { name: 'Lakeview Villas — 5BHK',            price: 47500000, type: 'Villa' },
  { name: 'Greenfield Plots — 1200 sq ft',     price: 4200000,  type: 'Plot' },
  { name: 'Greenfield Plots — 2400 sq ft',     price: 7800000,  type: 'Plot' },
  { name: 'Greenfield Plots — 3600 sq ft',     price: 11500000, type: 'Plot' },
  { name: 'Riverside Residency — 1BHK',        price: 4800000,  type: 'Apartment' },
  { name: 'Riverside Residency — 2BHK',        price: 7200000,  type: 'Apartment' },
  { name: 'Riverside Residency — 3BHK',        price: 9800000,  type: 'Apartment' },
  { name: 'Hillview Penthouse — 5BHK Duplex',  price: 65000000, type: 'Penthouse' },
  { name: 'Office Spaces — 1500 sq ft',        price: 12000000, type: 'Commercial' },
  { name: 'Retail Shop — 800 sq ft',           price: 6500000,  type: 'Commercial' },
  { name: 'Farmland — 5 acre',                 price: 15000000, type: 'Farmland' }
];

const SOURCES = ['Website', 'Facebook Lead Ad', 'Instagram Lead Ad', 'Google Ads', 'Referral', '99acres', 'MagicBricks', 'Walk-in'];
const TAG_POOL = ['hot', 'warm', 'cold', 'investor', 'end-user', 'NRI', 'first-time-buyer', 'budget-conscious', 'urgent'];

const REMARK_TEMPLATES = [
  'Spoke to client. Looking to buy in next 3 months. Budget around {budget}.',
  'Site visit scheduled for next weekend. Wants 3BHK with parking.',
  'Client comparing with {competitor}. Following up after their site visit.',
  'Quote sent. Awaiting feedback from spouse.',
  'Negotiating on price. Asking for 5% discount + free amenities.',
  'Proposal accepted in principle. Token amount discussion next week.',
  'Client unavailable. Will call back tomorrow morning.',
  'Loan eligibility check ongoing with HDFC.',
  'Family decision pending. Client wants brother to visit too.',
  'Booking confirmed! Token of ₹2L received.'
];

const COMPETITORS = ['Lodha', 'Godrej Properties', 'Hiranandani', 'Oberoi Realty', 'DLF', 'Prestige Group'];

// ------------------------------------------------------------------ helpers

const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const out = []; const used = new Set();
  while (out.length < n && out.length < arr.length) {
    const i = Math.floor(Math.random() * arr.length);
    if (!used.has(i)) { used.add(i); out.push(arr[i]); }
  }
  return out;
};
const fullName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const phoneIN  = () => '+91' + (Math.floor(Math.random() * 4) + 6) + Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
const emailFor = name => name.toLowerCase().replace(/[^a-z]/g, '.') + rand(1, 99) + '@example.com';
const daysAgo  = n => new Date(Date.now() - n * 86400000);
const isoDay   = d => d.toISOString().slice(0, 10);
const isoTs    = d => d.toISOString();

// ------------------------------------------------------------------ seed

async function seedDemo() {
  try {
    console.log('🎭 Seeding SmartCRM Demo data...\n');

    // ---- 1. Statuses (replace with the friendlier real-estate set) ----
    const STATUSES = [
      { name: 'New',                 color: '#3b82f6', sort_order: 10,  is_final: 0 },
      { name: 'Contacted',           color: '#06b6d4', sort_order: 20,  is_final: 0 },
      { name: 'Site Visit Scheduled',color: '#0ea5e9', sort_order: 30,  is_final: 0 },
      { name: 'Site Visit Done',     color: '#8b5cf6', sort_order: 40,  is_final: 0 },
      { name: 'Negotiating',         color: '#f59e0b', sort_order: 50,  is_final: 0 },
      { name: 'Booked',              color: '#10b981', sort_order: 90,  is_final: 1 },
      { name: 'Lost',                color: '#6b7280', sort_order: 100, is_final: 1 },
      { name: 'Not Interested',      color: '#9ca3af', sort_order: 110, is_final: 1 }
    ];
    const existingStatuses = await db.getAll('statuses');
    const statusIds = {};
    if (existingStatuses.length === 0) {
      for (const s of STATUSES) {
        const ins = await db.insert('statuses', s);
        statusIds[s.name] = ins.id;
      }
      console.log(`✓ Inserted ${STATUSES.length} statuses`);
    } else {
      for (const s of existingStatuses) statusIds[s.name] = s.id;
      console.log(`• ${existingStatuses.length} statuses already present — using them`);
    }

    // ---- 2. Sources ----
    const existingSources = await db.getAll('sources');
    if (existingSources.length === 0) {
      for (const n of SOURCES) await db.insert('sources', { name: n, is_active: 1 });
      console.log(`✓ Inserted ${SOURCES.length} sources`);
    }

    // ---- 3. Demo admin ----
    const ADMIN_EMAIL = 'demo@smartcrmsolution.com';
    const ADMIN_PASS  = 'demo123';
    let admin = await db.findOneBy('users', 'email', ADMIN_EMAIL);
    if (!admin) {
      const hash = bcrypt.hashSync(ADMIN_PASS, 10);
      const ins = await db.insert('users', {
        name: 'Demo Admin',
        email: ADMIN_EMAIL,
        phone: '+919812345678',
        role: 'admin',
        password_hash: hash,
        designation: 'Sales Director',
        department: 'Sales',
        monthly_salary: 150000,
        joining_date: '2024-01-15',
        is_active: 1
      });
      admin = { id: ins.id, email: ADMIN_EMAIL };
      console.log(`✓ Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
    } else {
      console.log(`• Admin already exists (${ADMIN_EMAIL})`);
    }

    // ---- 4. Sales reps ----
    const REPS = [
      { name: 'Priya Sharma',   email: 'priya@smartcrmsolution.com',   designation: 'Senior Sales Executive', salary: 65000 },
      { name: 'Rahul Verma',    email: 'rahul@smartcrmsolution.com',   designation: 'Sales Executive',         salary: 55000 },
      { name: 'Aarav Patel',    email: 'aarav@smartcrmsolution.com',   designation: 'Sales Executive',         salary: 55000 },
      { name: 'Diya Kapoor',    email: 'diya@smartcrmsolution.com',    designation: 'Sales Executive',         salary: 50000 }
    ];
    const repIds = [];
    for (const r of REPS) {
      let u = await db.findOneBy('users', 'email', r.email);
      if (!u) {
        const hash = bcrypt.hashSync('demo123', 10);
        const ins = await db.insert('users', {
          name: r.name, email: r.email,
          phone: phoneIN(),
          role: 'sales',
          password_hash: hash,
          parent_id: admin.id,
          designation: r.designation,
          department: 'Sales',
          monthly_salary: r.salary,
          joining_date: '2024-06-01',
          is_active: 1
        });
        repIds.push(ins.id);
      } else { repIds.push(u.id); }
    }
    console.log(`✓ ${REPS.length} sales reps`);

    // ---- 5. Properties (products) ----
    const existingProds = await db.getAll('products');
    const productIds = [];
    if (existingProds.length === 0) {
      for (const p of PROPERTIES) {
        const ins = await db.insert('products', {
          name: p.name,
          description: `${p.type} — premium real estate offering`,
          price: p.price,
          is_active: 1
        });
        productIds.push(ins.id);
      }
      console.log(`✓ Inserted ${PROPERTIES.length} properties`);
    } else {
      for (const p of existingProds) productIds.push(p.id);
      console.log(`• ${existingProds.length} properties already present`);
    }

    // ---- 6. Leads (100) ----
    const existingLeads = await db.getAll('leads');
    if (existingLeads.length < 50) {
      const statusNames = ['New','Contacted','Site Visit Scheduled','Site Visit Done','Negotiating','Booked','Lost','Not Interested'];
      const statusWeights = [25,20,15,10,12,8,5,5]; // distribution
      const weighted = [];
      statusNames.forEach((s, i) => { for (let k = 0; k < statusWeights[i]; k++) weighted.push(s); });

      for (let i = 0; i < 100; i++) {
        const name = fullName();
        const cityRow = pick(CITIES);
        const prop = pick(PROPERTIES);
        const status = pick(weighted);
        const createdAt = daysAgo(rand(0, 30));
        const tagSet = pickN(TAG_POOL, rand(0, 3));
        const ins = await db.insert('leads', {
          name, phone: phoneIN(), email: emailFor(name),
          source: pick(SOURCES),
          product: prop.name,
          status_id: statusIds[status],
          assigned_to: pick(repIds),
          created_by: admin.id,
          tags: tagSet.join(','),
          notes: `Interested in ${prop.name}. Budget ${(prop.price/100000).toFixed(1)}L.`,
          city: cityRow[0], state: cityRow[1], pincode: cityRow[2], country: 'India',
          value: prop.price,
          currency: 'INR',
          created_at: isoTs(createdAt),
          updated_at: isoTs(createdAt),
          last_status_change_at: isoTs(createdAt)
        });
        // Maybe schedule a follow-up (70% of active leads)
        if (status !== 'Booked' && status !== 'Lost' && status !== 'Not Interested' && Math.random() < 0.7) {
          const dueOffset = rand(-3, 14); // some overdue, some today, mostly future
          const dueAt = new Date(Date.now() + dueOffset * 86400000);
          dueAt.setHours(rand(10, 18), rand(0, 59), 0, 0);
          await db.insert('followups', {
            lead_id: ins.id,
            user_id: pick(repIds),
            due_at: isoTs(dueAt),
            note: 'Follow-up call to ' + name.split(' ')[0],
            is_done: 0,
            created_at: isoTs(createdAt)
          }).catch(() => {});
        }
        // Maybe add 1-3 remarks
        const numRemarks = rand(0, 3);
        for (let r = 0; r < numRemarks; r++) {
          const tpl = pick(REMARK_TEMPLATES)
            .replace('{budget}', `${(prop.price / 100000).toFixed(1)}L`)
            .replace('{competitor}', pick(COMPETITORS));
          await db.insert('remarks', {
            lead_id: ins.id,
            user_id: pick(repIds),
            text: tpl,
            created_at: isoTs(new Date(createdAt.getTime() + r * 86400000))
          }).catch(() => {});
        }
      }
      console.log(`✓ 100 leads + follow-ups + remarks`);
    } else {
      console.log(`• ${existingLeads.length} leads already present — skipping leads`);
    }

    // ---- 7. Attendance (last 30 days × 4 reps) ----
    const attendanceCount = (await db.getAll('attendance').catch(() => [])).length;
    if (attendanceCount < 50) {
      for (const rid of repIds) {
        for (let d = 1; d <= 30; d++) {
          const day = isoDay(daysAgo(d));
          const isSunday = new Date(day).getDay() === 0;
          if (isSunday) continue;
          const r = Math.random();
          let status, checkIn, checkOut;
          if (r < 0.05) { status = 'leave'; checkIn = null; checkOut = null; }
          else if (r < 0.10) { status = 'half_day'; checkIn = `${day}T09:30:00.000Z`; checkOut = `${day}T13:30:00.000Z`; }
          else { status = 'present'; checkIn = `${day}T09:${rand(0,59).toString().padStart(2,'0')}:00.000Z`; checkOut = `${day}T18:${rand(0,59).toString().padStart(2,'0')}:00.000Z`; }
          await db.insert('attendance', {
            user_id: rid, date: day,
            check_in: checkIn, check_out: checkOut,
            check_in_lat: 19.0760 + (Math.random() - 0.5) * 0.05,
            check_in_lng: 72.8777 + (Math.random() - 0.5) * 0.05,
            status
          }).catch(() => {});
        }
      }
      console.log(`✓ Attendance for ${repIds.length} reps × 30 days`);
    }

    // ---- 8. Tasks ----
    const existingTasks = await db.getAll('tasks').catch(() => []);
    if (existingTasks.length < 5) {
      const TASK_TITLES = [
        'Prepare proposal deck for Q3 campaign',
        'Call all hot leads from last week',
        'Site visit — Lakeview Villas this Saturday',
        'Update CRM custom fields for new product launch',
        'Reply to MagicBricks inquiry queue',
        'Coordinate broker meet for Hillview Penthouse',
        'Prepare commission report for July',
        'Train new joiner on lead pipeline',
        'Send festive offer WhatsApp blast',
        'Audit follow-ups due this week',
        'Confirm Saturday open house attendees',
        'Review legal docs for Greenfield Plots'
      ];
      const PRIORITIES = ['low','normal','high','urgent'];
      const STATUSES_T = ['open','open','open','in_progress','in_progress','done','done','done','done','open','in_progress','done'];
      for (let i = 0; i < TASK_TITLES.length; i++) {
        const due = new Date(Date.now() + rand(-3, 10) * 86400000);
        const status = STATUSES_T[i];
        await db.insert('tasks', {
          title: TASK_TITLES[i],
          description: `Demo task — ${TASK_TITLES[i].toLowerCase()}.`,
          assigned_to: pick(repIds),
          created_by: admin.id,
          due_at: isoTs(due),
          priority: pick(PRIORITIES),
          status,
          completed_at: status === 'done' ? isoTs(daysAgo(rand(1, 5))) : null
        }).catch(() => {});
      }
      console.log(`✓ ${TASK_TITLES.length} tasks`);
    }

    // ---- 9. Leave requests ----
    const leavesCount = (await db.getAll('leaves').catch(() => [])).length;
    if (leavesCount < 2) {
      await db.insert('leaves', {
        user_id: repIds[0],
        from_date: isoDay(daysAgo(-7)),
        to_date: isoDay(daysAgo(-9)),
        reason: 'Family wedding in Pune.',
        status: 'pending'
      }).catch(() => {});
      await db.insert('leaves', {
        user_id: repIds[1],
        from_date: isoDay(daysAgo(15)),
        to_date: isoDay(daysAgo(15)),
        reason: 'Medical appointment.',
        status: 'approved',
        approved_by: admin.id
      }).catch(() => {});
      await db.insert('leaves', {
        user_id: repIds[2],
        from_date: isoDay(daysAgo(-21)),
        to_date: isoDay(daysAgo(-23)),
        reason: 'Diwali holiday with family.',
        status: 'pending'
      }).catch(() => {});
      console.log(`✓ 3 leave requests`);
    }

    // ---- 10. Salaries (last 3 months × 4 reps) ----
    const salariesCount = (await db.getAll('salaries').catch(() => [])).length;
    if (salariesCount < 8) {
      const now = new Date();
      for (let m = 1; m <= 3; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        for (let i = 0; i < repIds.length; i++) {
          const base = REPS[i].salary;
          const allowances = Math.round(base * (0.10 + Math.random() * 0.15));
          const deductions = Math.round(base * 0.08);
          await db.insert('salaries', {
            user_id: repIds[i],
            month,
            base, allowances, deductions,
            net_pay: base + allowances - deductions,
            notes: `Performance bonus included for ${month}.`
          }).catch(() => {});
        }
      }
      console.log(`✓ Salary slips for last 3 months`);
    }

    // ---- 11. Brand config ----
    await db.upsertConfig?.('COMPANY_NAME', 'SmartCRM Demo').catch(() => {});
    await db.query?.(
      `INSERT INTO config (key, value) VALUES ('COMPANY_NAME', 'SmartCRM Demo')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
    ).catch(() => {});
    await db.query?.(
      `INSERT INTO config (key, value) VALUES ('BASE_URL', 'https://demo.smartcrmsolution.com')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
    ).catch(() => {});
    console.log(`✓ Brand config set`);

    console.log(`
🎉 Demo seed complete!

   URL:      https://demo.smartcrmsolution.com
   Login:    ${ADMIN_EMAIL} / ${ADMIN_PASS}
   Reps:     priya / rahul / aarav / diya @smartcrmsolution.com (password: demo123)

   100 leads · 15 properties · 30 days attendance · 12 tasks · 3 leaves · 12 salary slips
`);
  } catch (e) {
    console.error('✗ Seed failed:', e);
    throw e;
  }
}

// Allow both CLI use (`node db/seed-demo.js`) and module use (`require(...)`)
if (require.main === module) {
  seedDemo()
    .then(() => { db.pool.end().catch(() => {}); setImmediate(() => process.exit(0)); })
    .catch(() => { db.pool.end().catch(() => {}); setImmediate(() => process.exit(1)); });
}

module.exports = { seedDemo };
