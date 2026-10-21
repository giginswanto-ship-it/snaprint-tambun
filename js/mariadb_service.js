/**
 * js/mariadb_service.js - Layanan Koneksi & Sinkronisasi Langsung ke MariaDB / MySQL
 * Snaprint Digital Printing - Sistem RAB Terintegrasi
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Simple .env parser without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}
loadEnv();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'rab_snaprint',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

let pool = null;
let isConnected = false;
let lastError = null;

function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(DB_CONFIG);
    } catch (err) {
      lastError = err.message;
      console.error('❌ Gagal inisialisasi MariaDB Pool:', err.message);
    }
  }
  return pool;
}

async function checkConnection() {
  try {
    const p = getPool();
    if (!p) return false;
    const [rows] = await p.query('SELECT 1 as alive');
    isConnected = rows && rows[0] && rows[0].alive === 1;
    lastError = null;
    return isConnected;
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    return false;
  }
}

async function getDatabaseFromMariaDB() {
  const p = getPool();
  if (!p) throw new Error('Pool MariaDB tidak tersedia');

  // 1. Meta
  const [metaRows] = await p.query('SELECT * FROM project_meta ORDER BY id ASC LIMIT 1');
  const m = metaRows[0] || {};
  const meta = {
    documentNo: m.document_no || 'RAB-SNP/2026/04-01',
    outletLocation: m.outlet_location || '',
    date: m.project_date || '',
    projectStatus: m.project_status || 'Persiapan Fisik',
    targetDuration: m.target_duration || '4 Minggu',
    standardArea: m.standard_area || '45 – 60 m²',
    machineModel: m.machine_model || '',
    preparedBy: m.prepared_by || '',
    checkedBy: m.checked_by || '',
    approvedBy: m.approved_by || '',
    notes: m.notes || ''
  };

  // 2. Categories & capex items
  const [catRows] = await p.query('SELECT * FROM categories ORDER BY sort_order ASC');
  const [itemRows] = await p.query('SELECT * FROM capex_items ORDER BY sort_order ASC');

  const categories = catRows.map(c => {
    const items = itemRows
      .filter(it => it.category_id === c.id)
      .map(it => ({
        id: it.id,
        code: it.code,
        name: it.name,
        spec: it.spec,
        vol: Number(it.vol) || 1,
        sat: it.sat || 'Unit',
        price: Number(it.price) || 0,
        discount: Number(it.discount) || 0,
        status: it.status || 'pending',
        notes: it.notes || ''
      }));

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      color: c.color,
      items: items
    };
  });

  // 3. Cash Flow Schedules
  const [cfRows] = await p.query('SELECT * FROM cash_flow_schedules ORDER BY sort_order ASC');
  const cashFlowSchedule = cfRows.map(cf => ({
    termin: cf.termin,
    week: cf.week,
    focus: cf.focus,
    sharePercent: Number(cf.share_percent) || 0,
    nominal: Number(cf.nominal) || 0,
    status: cf.status || 'pending',
    paymentDate: cf.payment_date || null,
    refNo: cf.ref_no || null,
    notes: cf.notes || ''
  }));

  // 4. Working Capital
  const [wcRows] = await p.query('SELECT * FROM working_capital_settings ORDER BY id ASC LIMIT 1');
  const [salRows] = await p.query('SELECT * FROM staff_salaries ORDER BY sort_order ASC');
  const [utlRows] = await p.query('SELECT * FROM utility_costs ORDER BY sort_order ASC');

  const wc = wcRows[0] || {};
  const workingCapital = {
    runwayMonths: Number(wc.runway_months) || 3,
    rentPerYear: Number(wc.rent_per_year) || 0,
    rentPaymentMonths: Number(wc.rent_payment_months) || 12,
    rentDeposit: Number(wc.rent_deposit) || 0,
    pettyCashBuffer: Number(wc.petty_cash_buffer) || 0,
    marketingMonthly: Number(wc.marketing_monthly) || 0,
    salaries: salRows.map(s => ({
      id: s.id,
      position: s.position,
      count: Number(s.count) || 1,
      salaryPerMonth: Number(s.salary_per_month) || 0
    })),
    utilities: utlRows.map(u => ({
      id: u.id,
      name: u.name,
      costPerMonth: Number(u.cost_per_month) || 0
    }))
  };

  // 5. Simulations
  const [simRows] = await p.query('SELECT * FROM financial_simulations ORDER BY id ASC LIMIT 1');
  const [scRows] = await p.query('SELECT * FROM simulation_scenarios ORDER BY id ASC');

  const s = simRows[0] || {};
  const scenariosObj = {};
  scRows.forEach(sc => {
    scenariosObj[sc.scenario_key] = {
      label: sc.label,
      dailyA3Prints: Number(sc.daily_a3_prints) || 0,
      dailyOutdoorM2: Number(sc.daily_outdoor_m2) || 0,
      monthlyOtherProductsSales: Number(sc.monthly_other_products_sales) || 0
    };
  });

  const simulation = {
    workDaysPerMonth: Number(s.work_days_per_month) || 26,
    dailyA3Prints: Number(s.daily_a3_prints) || 450,
    a3SellPrice: Number(s.a3_sell_price) || 5000,
    a3HppCost: Number(s.a3_hpp_cost) || 2150,
    dailyOutdoorM2: Number(s.daily_outdoor_m2) || 35,
    outdoorSellPrice: Number(s.outdoor_sell_price) || 22000,
    outdoorHppCost: Number(s.outdoor_hpp_cost) || 9500,
    monthlyOtherProductsSales: Number(s.monthly_other_products_sales) || 12500000,
    otherProductsMarginPercent: Number(s.other_products_margin_percent) || 55,
    targetPaybackMonths: Number(s.target_payback_months) || 18,
    activeScenario: s.active_scenario || 'moderat',
    scenarios: scenariosObj
  };

  // 6. Business Plan
  const [segRows] = await p.query('SELECT * FROM business_plan_segments ORDER BY sort_order ASC');
  const [propRows] = await p.query('SELECT * FROM business_plan_propositions ORDER BY sort_order ASC');

  const businessPlan = {
    title: 'Business Plan & Prospektus Bisnis Snaprint Digital Printing',
    vision: 'Menjadi sentra digital printing one-stop service terdepan dengan integrasi mesin laser presisi dan outdoor format besar 3.2m.',
    marketSegments: segRows.map(seg => ({
      name: seg.name,
      share: Number(seg.share_percent) || 0,
      desc: seg.description || ''
    })),
    valuePropositions: propRows.map(pr => pr.proposition)
  };

  // 7. Discount Settings
  const [discRows] = await p.query('SELECT * FROM discount_settings ORDER BY id ASC LIMIT 1');
  const d = discRows[0] || {};
  const discount = {
    enabled: Boolean(d.enabled),
    type: d.type || 'nominal',
    value: Number(d.value) || 0,
    label: d.label || 'Potongan Khusus Kemitraan / Negosiasi Vendor'
  };

  return {
    _version: '2.0.0-mariadb',
    _source: 'MariaDB 10.4',
    _lastUpdated: new Date().toISOString(),
    meta,
    categories,
    cashFlowSchedule,
    workingCapital,
    simulation,
    businessPlan,
    discount
  };
}

async function saveDatabaseToMariaDB(data) {
  const p = getPool();
  if (!p) throw new Error('Pool MariaDB tidak tersedia');

  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Meta
    if (data.meta) {
      const m = data.meta;
      await conn.query(`
        INSERT INTO project_meta (id, document_no, outlet_location, project_date, project_status, target_duration, standard_area, machine_model, prepared_by, checked_by, approved_by, notes)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          document_no = VALUES(document_no),
          outlet_location = VALUES(outlet_location),
          project_date = VALUES(project_date),
          project_status = VALUES(project_status),
          target_duration = VALUES(target_duration),
          standard_area = VALUES(standard_area),
          machine_model = VALUES(machine_model),
          prepared_by = VALUES(prepared_by),
          checked_by = VALUES(checked_by),
          approved_by = VALUES(approved_by),
          notes = VALUES(notes)
      `, [m.documentNo || '', m.outletLocation || '', m.date || '', m.projectStatus || '', m.targetDuration || '', m.standardArea || '', m.machineModel || '', m.preparedBy || '', m.checkedBy || '', m.approvedBy || '', m.notes || '']);
    }

    // 2. Categories and capex_items
    if (Array.isArray(data.categories)) {
      // Re-sync categories
      await conn.query('DELETE FROM capex_items');
      await conn.query('DELETE FROM categories');

      for (let i = 0; i < data.categories.length; i++) {
        const cat = data.categories[i];
        await conn.query(
          'INSERT INTO categories (id, code, name, color, sort_order) VALUES (?, ?, ?, ?, ?)',
          [cat.id, cat.code, cat.name, cat.color || 'blue', i + 1]
        );

        if (Array.isArray(cat.items)) {
          for (let j = 0; j < cat.items.length; j++) {
            const it = cat.items[j];
            await conn.query(`
              INSERT INTO capex_items (id, category_id, code, name, spec, vol, sat, price, discount, status, notes, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              it.id, cat.id, it.code, it.name, it.spec || '',
              it.vol || 1, it.sat || 'Unit', it.price || 0,
              it.discount || 0, it.status || 'pending', it.notes || '', j + 1
            ]);
          }
        }
      }
    }

    // 3. Cash Flow Schedules
    if (Array.isArray(data.cashFlowSchedule)) {
      await conn.query('DELETE FROM cash_flow_schedules');
      for (let i = 0; i < data.cashFlowSchedule.length; i++) {
        const cf = data.cashFlowSchedule[i];
        await conn.query(`
          INSERT INTO cash_flow_schedules (id, termin, week, focus, share_percent, nominal, status, payment_date, ref_no, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          i + 1, cf.termin, cf.week, cf.focus, cf.sharePercent || 0,
          cf.nominal || 0, cf.status || 'pending', cf.paymentDate || null,
          cf.refNo || null, cf.notes || '', i + 1
        ]);
      }
    }

    // 4. Working Capital
    if (data.workingCapital) {
      const wc = data.workingCapital;
      await conn.query(`
        INSERT INTO working_capital_settings (id, runway_months, rent_per_year, rent_payment_months, rent_deposit, petty_cash_buffer, marketing_monthly)
        VALUES (1, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          runway_months = VALUES(runway_months),
          rent_per_year = VALUES(rent_per_year),
          rent_payment_months = VALUES(rent_payment_months),
          rent_deposit = VALUES(rent_deposit),
          petty_cash_buffer = VALUES(petty_cash_buffer),
          marketing_monthly = VALUES(marketing_monthly)
      `, [wc.runwayMonths || 3, wc.rentPerYear || 0, wc.rentPaymentMonths || 12, wc.rentDeposit || 0, wc.pettyCashBuffer || 0, wc.marketingMonthly || 0]);

      if (Array.isArray(wc.salaries)) {
        await conn.query('DELETE FROM staff_salaries');
        for (let i = 0; i < wc.salaries.length; i++) {
          const s = wc.salaries[i];
          await conn.query(
            'INSERT INTO staff_salaries (id, position, count, salary_per_month, sort_order) VALUES (?, ?, ?, ?, ?)',
            [s.id, s.position, s.count || 1, s.salaryPerMonth || 0, i + 1]
          );
        }
      }

      if (Array.isArray(wc.utilities)) {
        await conn.query('DELETE FROM utility_costs');
        for (let i = 0; i < wc.utilities.length; i++) {
          const u = wc.utilities[i];
          await conn.query(
            'INSERT INTO utility_costs (id, name, cost_per_month, sort_order) VALUES (?, ?, ?, ?)',
            [u.id, u.name, u.costPerMonth || 0, i + 1]
          );
        }
      }
    }

    // 5. Simulations
    if (data.simulation) {
      const sim = data.simulation;
      await conn.query(`
        INSERT INTO financial_simulations (id, work_days_per_month, daily_a3_prints, a3_sell_price, a3_hpp_cost, daily_outdoor_m2, outdoor_sell_price, outdoor_hpp_cost, monthly_other_products_sales, other_products_margin_percent, target_payback_months, active_scenario)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          work_days_per_month = VALUES(work_days_per_month),
          daily_a3_prints = VALUES(daily_a3_prints),
          a3_sell_price = VALUES(a3_sell_price),
          a3_hpp_cost = VALUES(a3_hpp_cost),
          daily_outdoor_m2 = VALUES(daily_outdoor_m2),
          outdoor_sell_price = VALUES(outdoor_sell_price),
          outdoor_hpp_cost = VALUES(outdoor_hpp_cost),
          monthly_other_products_sales = VALUES(monthly_other_products_sales),
          other_products_margin_percent = VALUES(other_products_margin_percent),
          target_payback_months = VALUES(target_payback_months),
          active_scenario = VALUES(active_scenario)
      `, [
        sim.workDaysPerMonth || 26, sim.dailyA3Prints || 450, sim.a3SellPrice || 5000,
        sim.a3HppCost || 2150, sim.dailyOutdoorM2 || 35, sim.outdoorSellPrice || 22000,
        sim.outdoorHppCost || 9500, sim.monthlyOtherProductsSales || 12500000,
        sim.otherProductsMarginPercent || 55, sim.targetPaybackMonths || 18,
        sim.activeScenario || 'moderat'
      ]);

      if (sim.scenarios && typeof sim.scenarios === 'object') {
        const keys = Object.keys(sim.scenarios);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const sc = sim.scenarios[k];
          await conn.query(`
            INSERT INTO simulation_scenarios (id, scenario_key, label, daily_a3_prints, daily_outdoor_m2, monthly_other_products_sales)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              label = VALUES(label),
              daily_a3_prints = VALUES(daily_a3_prints),
              daily_outdoor_m2 = VALUES(daily_outdoor_m2),
              monthly_other_products_sales = VALUES(monthly_other_products_sales)
          `, [i + 1, k, sc.label || k, sc.dailyA3Prints || 0, sc.dailyOutdoorM2 || 0, sc.monthlyOtherProductsSales || 0]);
        }
      }
    }

    // 6. Discount
    if (data.discount) {
      const disc = data.discount;
      await conn.query(`
        INSERT INTO discount_settings (id, enabled, type, value, label)
        VALUES (1, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          enabled = VALUES(enabled),
          type = VALUES(type),
          value = VALUES(value),
          label = VALUES(label)
      `, [disc.enabled ? 1 : 0, disc.type || 'nominal', disc.value || 0, disc.label || '']);
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  DB_CONFIG,
  getPool,
  checkConnection,
  getDatabaseFromMariaDB,
  saveDatabaseToMariaDB
};
