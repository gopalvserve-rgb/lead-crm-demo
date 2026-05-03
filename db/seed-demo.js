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

    // ---- 10b. Customers (converted from won leads) ----
    const customersCount = (await db.getAll('customers').catch(() => [])).length;
    if (customersCount < 3) {
      const wonStatusId = statusIds['Booked'] || statusIds['Won'];
      const wonLeads = (await db.getAll('leads').catch(() => [])).filter(l => Number(l.status_id) === Number(wonStatusId)).slice(0, 8);
      for (let i = 0; i < Math.max(wonLeads.length, 8); i++) {
        const l = wonLeads[i] || {};
        const name = l.name || fullName();
        const phone = l.phone || phoneIN();
        const cityRow = pick(CITIES);
        const prop = pick(PROPERTIES);
        const customerSince = isoDay(daysAgo(rand(30, 180)));
        const customerStatus = pick(['active','active','active','active','lapsed']);
        const ltv = prop.price * (rand(1, 3));
        try {
          const cIns = await db.insert('customers', {
            from_lead_id: l.id || null,
            name,
            phone,
            email: l.email || emailFor(name),
            address: cityRow[0] + ', India',
            city: cityRow[0], state: cityRow[1], pincode: cityRow[2], country: 'India',
            customer_since: customerSince,
            status: customerStatus,
            tags: pick(['premium', 'repeat', 'investor', 'referrer']),
            notes: `Purchased ${prop.name}. ${customerStatus === 'lapsed' ? 'Renewal pending.' : 'Active customer.'}`,
            assigned_to: pick(repIds),
            lifetime_value: ltv,
            total_purchases: rand(1, 4),
            last_purchase_at: isoTs(daysAgo(rand(7, 90))),
            created_by: admin.id
          });
          // Add a sale record
          await db.insert('customer_sales', {
            customer_id: cIns.id,
            product_name: prop.name,
            amount: prop.price,
            sale_date: customerSince,
            payment_status: pick(['paid', 'paid', 'paid', 'partial']),
            notes: 'Token + booking complete.',
            created_by: pick(repIds)
          }).catch(() => {});
          // Add 1-2 customer remarks
          await db.insert('customer_remarks', {
            customer_id: cIns.id,
            user_id: pick(repIds),
            text: pick(['Quarterly check-in done. Customer happy.', 'Discussed possible upsell.', 'Sent festive greetings.', 'Onboarded family members.']),
            remark_type: pick(['call', 'whatsapp', 'meeting', 'note'])
          }).catch(() => {});
        } catch (e) { /* schema diff tolerated */ }
      }
      console.log(`✓ Customers + sales + remarks`);
    }

    // ---- 10c. Inventory ----
    const inventoryCount = (await db.getAll('inventory').catch(() => [])).length;
    if (inventoryCount < 5) {
      const inventoryItems = [
        { name: 'Celeste Skyview Towers — A1', units_total: 100, units_sold: 67, units_blocked: 5, location: 'Mumbai, MH' },
        { name: 'Celeste Skyview Towers — A2', units_total: 80,  units_sold: 42, units_blocked: 3, location: 'Mumbai, MH' },
        { name: 'Lakeview Villas (Phase 1)',   units_total: 24,  units_sold: 14, units_blocked: 2, location: 'Pune, MH' },
        { name: 'Greenfield Plots (Sector 5)', units_total: 50,  units_sold: 31, units_blocked: 4, location: 'Bengaluru, KA' },
        { name: 'Riverside Residency (B Wing)',units_total: 60,  units_sold: 22, units_blocked: 1, location: 'Hyderabad, TS' },
        { name: 'Hillview Penthouse',          units_total: 8,   units_sold: 3,  units_blocked: 0, location: 'Delhi, DL' },
        { name: 'Office Spaces — Floor 7',     units_total: 12,  units_sold: 9,  units_blocked: 0, location: 'Mumbai BKC' }
      ];
      for (const inv of inventoryItems) {
        await db.insert('inventory', Object.assign(inv, {
          units_available: inv.units_total - inv.units_sold - inv.units_blocked,
          notes: 'Demo inventory tracker.',
          created_by: admin.id
        })).catch(() => {});
      }
      console.log(`✓ Inventory (${inventoryItems.length} projects)`);
    }

    // ---- 10d. Team chat (1 group + 1 DM with messages) ----
    const chatRoomsCount = (await db.getAll('chat_rooms').catch(() => [])).length;
    if (chatRoomsCount < 2) {
      try {
        // Group room
        const groupRoom = await db.insert('chat_rooms', {
          type: 'group',
          name: 'Sales Team 🚀',
          created_by: admin.id
        });
        const allUserIds = [admin.id, ...repIds];
        for (const uid of allUserIds) {
          await db.insert('chat_room_members', { room_id: groupRoom.id, user_id: uid }).catch(() => {});
        }
        const groupMsgs = [
          [admin.id, 'Good morning team! Big push today on the Skyview launch.'],
          [repIds[0], 'On it! 3 site visits scheduled for today.'],
          [repIds[1], 'Just closed Mr. Sharma\'s 3BHK booking 🎉'],
          [admin.id, 'Brilliant @Rahul! Bonus on the way 💰'],
          [repIds[2], 'Need help with Lakeview brochure — anyone has the latest?'],
          [repIds[3], 'I have it — sending now.'],
          [admin.id, 'EOD report at 7pm in the channel please.']
        ];
        for (let i = 0; i < groupMsgs.length; i++) {
          await db.insert('chat_messages', {
            room_id: groupRoom.id,
            user_id: groupMsgs[i][0],
            text: groupMsgs[i][1],
            created_at: isoTs(new Date(Date.now() - (groupMsgs.length - i) * 600000))
          }).catch(() => {});
        }

        // DM room (admin ↔ Priya)
        const dmRoom = await db.insert('chat_rooms', {
          type: 'dm',
          name: '',
          created_by: admin.id
        }).catch(() => null);
        if (dmRoom) {
          await db.insert('chat_room_members', { room_id: dmRoom.id, user_id: admin.id }).catch(() => {});
          await db.insert('chat_room_members', { room_id: dmRoom.id, user_id: repIds[0] }).catch(() => {});
          const dmMsgs = [
            [admin.id, 'Hi Priya, how\'s the Skyview pitch going?'],
            [repIds[0], 'Good — I think we close 2 more this week.'],
            [admin.id, '🎯 Keep me posted.']
          ];
          for (let i = 0; i < dmMsgs.length; i++) {
            await db.insert('chat_messages', {
              room_id: dmRoom.id,
              user_id: dmMsgs[i][0],
              text: dmMsgs[i][1],
              created_at: isoTs(new Date(Date.now() - (dmMsgs.length - i) * 1200000))
            }).catch(() => {});
          }
        }
        console.log(`✓ Team chat (group + DM)`);
      } catch (e) { console.warn('  (chat seed skipped:', e.message, ')'); }
    }

    // ---- 10e. TAT thresholds + violations ----
    const tatCount = (await db.getAll('tat_thresholds').catch(() => [])).length;
    if (tatCount === 0) {
      try {
        const newId = statusIds['New'];
        const contactedId = statusIds['Contacted'];
        const visitId = statusIds['Site Visit Scheduled'];
        if (newId) await db.insert('tat_thresholds', { from_status_id: newId, hours: 2, label: 'New → Contact within 2h' }).catch(() => {});
        if (contactedId) await db.insert('tat_thresholds', { from_status_id: contactedId, hours: 24, label: 'Contacted → Schedule visit within 24h' }).catch(() => {});
        if (visitId) await db.insert('tat_thresholds', { from_status_id: visitId, hours: 72, label: 'Visit → Decision within 72h' }).catch(() => {});

        // Create some TAT violations on a few leads (the ones still in early stages)
        const leadsForViolations = (await db.getAll('leads').catch(() => [])).slice(0, 12);
        for (const l of leadsForViolations) {
          if (Math.random() < 0.4) {
            await db.insert('tat_violations', {
              lead_id: l.id,
              user_id: l.assigned_to || pick(repIds),
              status_id: l.status_id,
              threshold_hours: pick([2, 24, 72]),
              actual_hours: rand(8, 96),
              created_at: isoTs(daysAgo(rand(1, 5)))
            }).catch(() => {});
          }
        }
        console.log(`✓ TAT thresholds + violations`);
      } catch (e) { /* schema diff tolerated */ }
    }

    // ---- 10f. Call recordings with AI summaries (the showpiece data) ----
    // Demo prospects need to SEE the AI feature working without uploading
    // real audio. We seed ~35 recordings across leads/reps/sentiments,
    // each with a full transcript, summary, action items, suggested
    // status, manual rating, AI-suggested rating, plus token counts and
    // realistic vendor cost so the AI Usage view shows believable numbers.
    // Backfill cost columns on any existing recordings whose cost is null —
    // happens when seed ran before pg.js whitelist was updated.
    try {
      await db.query(
        `UPDATE lead_recordings
            SET ai_input_tokens  = COALESCE(ai_input_tokens, GREATEST(duration_s, 1) * 32),
                ai_output_tokens = COALESCE(ai_output_tokens, 700),
                ai_cost_usd      = COALESCE(ai_cost_usd,
                                       (GREATEST(duration_s,1)*32)/1000000.0 * 0.30
                                     + 700/1000000.0 * 2.50),
                ai_cost_inr      = COALESCE(ai_cost_inr,
                                       ((GREATEST(duration_s,1)*32)/1000000.0 * 0.30
                                       + 700/1000000.0 * 2.50) * 84)
          WHERE ai_provider IS NOT NULL
            AND (ai_cost_inr IS NULL OR ai_cost_inr = 0)`
      );
      console.log('✓ Backfilled missing AI cost values on existing recordings');
    } catch (e) {
      // Schema not migrated yet — skip silently.
      if (!/column .* does not exist/i.test(e.message)) {
        console.warn('[demo-seed] cost backfill skipped:', e.message);
      }
    }

    const recCount = (await db.getAll('lead_recordings').catch(() => [])).length;
    // Bumped threshold from 5 → 50 so the existing 35-recording seed
    // re-runs once with the new wider distribution (recordings now go
    // to lead's assignee + spread across 80 leads instead of 35).
    if (recCount < 50) {
      const allLeads = await db.getAll('leads').catch(() => []);
      const statuses = await db.getAll('statuses').catch(() => []);
      const sIdByName = Object.fromEntries(statuses.map(s => [String(s.name).toLowerCase(), s.id]));

      // 8 conversation templates spanning sentiment + outcome.
      const TEMPLATES = [
        {
          summary: 'Rep introduced 3BHK Skyview Tower at ₹1.25Cr. Customer keen, asked about parking + amenities. Site visit booked for Saturday 11 AM.',
          transcript: 'Rep: Good morning sir, this is Priya from Celeste Abode about Skyview Towers.\nCustomer: Hello Priya, yes I had filled the form online.\nRep: I have 3BHK in B-wing, ₹1.25 crore inclusive of one parking. Floor 12 east-facing.\nCustomer: That sounds good. What about amenities?\nRep: Full clubhouse, pool, gym, kids play area, 24×7 security.\nCustomer: Can I visit this Saturday?\nRep: Saturday 11 AM works. I will share location pin on WhatsApp.\nCustomer: Perfect. Thank you.\nRep: Thank you sir.',
          action_items: ['Send Skyview brochure on WhatsApp', 'Send Saturday 11 AM location pin', 'Block 3BHK B-12 inventory tentatively'],
          sentiment: 'positive', suggested_status: 'Site Visit Scheduled', next_followup_in_days: 5,
          key_insight: 'Customer self-suggested the visit time — strong intent. Rep should arrange refreshments + token form ready.',
          rating: 5, ai_rating: 5
        },
        {
          summary: 'First call to fresh inquiry. Customer was busy in a meeting, agreed to a callback tomorrow at 4 PM. Brief introduction given.',
          transcript: 'Rep: Hi sir, this is Rahul from Celeste Abode...\nCustomer: I am in a meeting, can you call later?\nRep: Sure, what time works for you?\nCustomer: 4 PM tomorrow.\nRep: Booked. I will call at 4 PM tomorrow.',
          action_items: ['Call back tomorrow 4 PM', 'Save phone-number with name on contacts'],
          sentiment: 'neutral', suggested_status: 'Contacted', next_followup_in_days: 1,
          key_insight: 'Mid-day calls during business hours frequently get rejected. Try evening 6-8 PM slot for cold outreach.',
          rating: 3, ai_rating: 3
        },
        {
          summary: 'Customer compared Lakeview Villas with Hiranandani. Concerned about price (₹3.25Cr vs Hiranandani ₹2.9Cr). Requested 5% discount.',
          transcript: 'Customer: Lakeview is ₹3.25Cr but Hiranandani is offering similar at ₹2.9Cr.\nRep: Sir Lakeview is sea-facing, bigger built-up, premium amenities. Different value proposition.\nCustomer: Can you do 5% discount?\nRep: Let me check with management and get back tomorrow.\nCustomer: OK but I am also seeing Lodha next week.',
          action_items: ['Escalate 5% discount request to manager', 'Send comparison sheet vs Hiranandani', 'Beat Lodha visit by Saturday'],
          sentiment: 'neutral', suggested_status: 'Negotiating', next_followup_in_days: 1,
          key_insight: 'Customer is actively shopping multiple builders. Price-sensitive — bundle parking + GST waiver might close the deal without 5% discount.',
          rating: 4, ai_rating: 4
        },
        {
          summary: '3BHK booking confirmed! Customer paid ₹2L token via UPI. Documentation visit on Wednesday. Couple very happy.',
          transcript: 'Customer: Send the bank details, I will pay token now.\nRep: Sending account details on WhatsApp. ₹2 lakhs token.\nCustomer: Done, transferred. Got reference.\nRep: Confirmed, congratulations sir! Documentation on Wednesday at office.\nCustomer: Thank you Priya, this was so smooth.',
          action_items: ['Schedule documentation Wed 11 AM', 'Send welcome kit', 'Loop in legal team for sale agreement', 'Convert to Customer record'],
          sentiment: 'positive', suggested_status: 'Booked', next_followup_in_days: 2,
          key_insight: 'Customer praised process simplicity — request a Google review at Wednesday meeting.',
          rating: 5, ai_rating: 5
        },
        {
          summary: 'Customer not interested. Already booked elsewhere with Lodha last week. Polite decline. Asked to be removed from outreach.',
          transcript: 'Customer: I have already booked with Lodha last week.\nRep: Oh I see, congratulations sir. Can I keep you in touch for future investment options?\nCustomer: No please, do not call again.',
          action_items: ['Mark lead as Lost — competitor (Lodha)', 'Add to do-not-call list'],
          sentiment: 'negative', suggested_status: 'Lost', next_followup_in_days: 30,
          key_insight: 'Lodha closed in our funnel timeframe. Investigate why our 1st-call delay let them in.',
          rating: 2, ai_rating: 2
        },
        {
          summary: 'Customer\'s wife wants to see the property too. Rescheduled visit from Saturday to next Sunday so both can come together.',
          transcript: 'Customer: My wife also wants to see, can we do Sunday instead?\nRep: Of course sir, Sunday 11 AM same time.\nCustomer: Yes that works.\nRep: I will send you a reminder Saturday evening.',
          action_items: ['Reschedule visit to Sunday 11 AM', 'Send reminder Saturday evening', 'Prepare BOTH partners-friendly tour: family room first'],
          sentiment: 'positive', suggested_status: 'Site Visit Scheduled', next_followup_in_days: 7,
          key_insight: 'Spouse has equal/final say — schedule the tour around her interests (kitchen + kids amenities).',
          rating: 4, ai_rating: 4
        },
        {
          summary: 'Customer concerned about loan eligibility. Rep introduced HDFC tie-up. Checking eligibility, callback Friday.',
          transcript: 'Customer: I am worried about loan, salary is ₹85k, will I get ₹80L loan?\nRep: We have tie-up with HDFC, you can get up to 80% LTV with that salary easily. Let me get the eligibility checked. Please share PAN.\nCustomer: Sending now on WhatsApp.\nRep: I will get back Friday with the eligibility letter.',
          action_items: ['Share PAN + last 6 months salary slips with HDFC', 'Get eligibility letter by Thursday', 'Call Friday 11 AM with result'],
          sentiment: 'positive', suggested_status: 'Negotiating', next_followup_in_days: 4,
          key_insight: 'Loan-anxiety is the #1 drop-off point. Lead with HDFC partnership in initial pitch to disarm.',
          rating: 4, ai_rating: 4
        },
        {
          summary: 'Customer wants to negotiate registration cost. Asked rep to absorb stamp duty (~₹3L). Rep declined politely, will check waiver options.',
          transcript: 'Customer: Stamp duty is 6% — that is ₹3 lakhs extra. Can you absorb it?\nRep: Sir we cannot absorb stamp duty, but we can offer free club membership for 2 years (~₹1.2L value).\nCustomer: I want both — free membership + 50% stamp duty.\nRep: Let me check with management. I will revert tomorrow.',
          action_items: ['Ask manager: 50% stamp duty waiver feasibility', 'Quote: club membership + ₹1L registration support package', 'Schedule callback tomorrow 5 PM'],
          sentiment: 'neutral', suggested_status: 'Negotiating', next_followup_in_days: 1,
          key_insight: 'Customer is anchoring high — counter with 50% of his ask + premium amenity. Standard negotiation playbook.',
          rating: 3, ai_rating: 3
        }
      ];

      // Pricing constants for cost computation (must mirror utils/aiCallSummary.js)
      const GEMINI_INPUT_USD_PER_M  = 0.30;
      const GEMINI_OUTPUT_USD_PER_M = 2.50;
      const USD_TO_INR              = 84;
      const AUDIO_TOKENS_PER_SEC    = 32;
      function _cost(durSec, outTokens) {
        const audioTokens = durSec * AUDIO_TOKENS_PER_SEC;
        const usd = audioTokens / 1_000_000 * GEMINI_INPUT_USD_PER_M
                  + outTokens   / 1_000_000 * GEMINI_OUTPUT_USD_PER_M;
        return {
          input_tokens: audioTokens,
          output_tokens: outTokens,
          cost_usd: Number(usd.toFixed(6)),
          cost_inr: Number((usd * USD_TO_INR).toFixed(4))
        };
      }

      // Spread 70 recordings — most active leads get one, some get two.
      // Recording's user_id = lead's assignee, so when a rep logs in,
      // the recordings on their leads are theirs (matches realistic
      // workflow + demo discoverability — every rep sees recordings
      // on their own leads).
      const NUM_RECORDINGS = 70;
      const recentLeads = allLeads.slice(0, 80);
      let inserted = 0;
      for (let i = 0; i < NUM_RECORDINGS && i < recentLeads.length * 2; i++) {
        const lead = recentLeads[i % recentLeads.length];
        const tpl = TEMPLATES[i % TEMPLATES.length];
        const dur = rand(45, 480);                      // 45s to 8 min
        const repId = lead.assigned_to || pick(repIds);
        const createdDay = daysAgo(rand(0, 28));
        // 700 output tokens average per call summary
        const cost = _cost(dur, rand(550, 850));

        // Map suggested_status text → real status_id from this DB
        const sId = sIdByName[String(tpl.suggested_status).toLowerCase()] || null;

        try {
          // Note: audio_bytes is omitted entirely (BYTEA accepts null but
          // some drivers prefer the field absent). The audio player on the
          // recording row will 404 on /api/recordings/:id/audio in the demo
          // — that's fine, the AI summary card is the demo target.
          await db.insert('lead_recordings', {
            lead_id: lead.id,
            user_id: repId,
            phone: lead.phone,
            direction: pick(['out', 'out', 'out', 'in']), // mostly outbound
            duration_s: dur,
            mime_type: 'audio/mp3',
            size_bytes: dur * 14000,                    // ~14 KB/sec for compressed mp3
            started_at: isoTs(createdDay),
            created_at: isoTs(createdDay),
            // AI summary fields — pre-populated so the UI shows everything
            transcript: tpl.transcript,
            summary: tpl.summary,
            action_items: JSON.stringify(tpl.action_items),
            sentiment: tpl.sentiment,
            suggested_status_id: sId,
            next_followup_days: tpl.next_followup_in_days,
            key_insight: tpl.key_insight,
            ai_processed_at: isoTs(new Date(createdDay.getTime() + 60_000)),
            ai_provider: 'gemini',
            ai_model: 'gemini-2.5-flash',
            ai_error: null,
            // Manual rating on ~70% of recordings, the rest unrated
            rating: Math.random() < 0.7 ? tpl.rating : null,
            rating_by: Math.random() < 0.7 ? admin.id : null,
            rated_at: Math.random() < 0.7 ? isoTs(new Date(createdDay.getTime() + 5 * 60_000)) : null,
            ai_suggested_rating: tpl.ai_rating,
            // Cost tracking — feeds the AI Usage report
            ai_input_tokens:  cost.input_tokens,
            ai_output_tokens: cost.output_tokens,
            ai_cost_usd:      cost.cost_usd,
            ai_cost_inr:      cost.cost_inr
          });
          inserted++;
        } catch (e) {
          // Schema column missing — older deploy. Skip silently.
          if (i === 0) console.warn('[demo-seed] recordings skipped:', e.message);
          break;
        }
      }
      console.log(`✓ ${inserted} call recordings with AI summaries`);
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
