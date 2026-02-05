/**
 * Seed Test Data
 * FinHealth Squad
 *
 * Populates Supabase with sample data for testing
 *
 * Run:
 *   npx ts-node examples/seed-test-data.ts
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '..', '.env') });

import { getSupabaseClient } from '../src/database/supabase-client';

// Sample health insurers
const HEALTH_INSURERS = [
  {
    ans_code: '005711',
    name: 'Unimed São Paulo',
    cnpj: '43.202.472/0001-30',
    tiss_version: '3.05.00',
    active: true,
    config: {},
  },
  {
    ans_code: '326305',
    name: 'Bradesco Saúde',
    cnpj: '92.693.118/0001-60',
    tiss_version: '3.05.00',
    active: true,
    config: {},
  },
  {
    ans_code: '359017',
    name: 'SulAmérica Saúde',
    cnpj: '01.685.053/0001-56',
    tiss_version: '3.05.00',
    active: true,
    config: {},
  },
  {
    ans_code: '006246',
    name: 'Amil',
    cnpj: '29.309.127/0001-79',
    tiss_version: '3.05.00',
    active: true,
    config: {},
  },
];

// Sample patients
const PATIENTS = [
  {
    external_id: 'PAT-001',
    name: 'João Carlos Silva',
    cpf: '111.222.333-44',
    birth_date: '1975-05-20',
    gender: 'M',
    phone: '(11) 99999-1111',
    email: 'joao.silva@email.com',
  },
  {
    external_id: 'PAT-002',
    name: 'Maria Aparecida Santos',
    cpf: '222.333.444-55',
    birth_date: '1982-08-15',
    gender: 'F',
    phone: '(11) 99999-2222',
    email: 'maria.santos@email.com',
  },
  {
    external_id: 'PAT-003',
    name: 'Pedro Henrique Oliveira',
    cpf: '333.444.555-66',
    birth_date: '1990-12-01',
    gender: 'M',
    phone: '(11) 99999-3333',
    email: 'pedro.oliveira@email.com',
  },
  {
    external_id: 'PAT-004',
    name: 'Ana Paula Costa',
    cpf: '444.555.666-77',
    birth_date: '1968-03-25',
    gender: 'F',
    phone: '(11) 99999-4444',
    email: 'ana.costa@email.com',
  },
  {
    external_id: 'PAT-005',
    name: 'Carlos Eduardo Ferreira',
    cpf: '555.666.777-88',
    birth_date: '1955-11-10',
    gender: 'M',
    phone: '(11) 99999-5555',
    email: 'carlos.ferreira@email.com',
  },
];

// Sample medical accounts with procedures
const MEDICAL_ACCOUNTS = [
  {
    account_type: 'ambulatorial',
    status: 'pending',
    procedures: [
      { tuss_code: '10101012', description: 'Consulta em consultório', unit_price: 150, quantity: 1 },
      { tuss_code: '40301010', description: 'Hemograma completo', unit_price: 25, quantity: 1 },
      { tuss_code: '40302040', description: 'Glicose', unit_price: 12, quantity: 1 },
    ],
  },
  {
    account_type: 'sadt',
    status: 'pending',
    procedures: [
      { tuss_code: '41001010', description: 'Radiografia de tórax', unit_price: 85, quantity: 1 },
      { tuss_code: '40808050', description: 'Ultrassonografia de abdome total', unit_price: 180, quantity: 1 },
    ],
  },
  {
    account_type: 'internacao',
    status: 'validated',
    procedures: [
      { tuss_code: '30101190', description: 'Apendicectomia', unit_price: 1500, quantity: 1 },
      { tuss_code: '10101012', description: 'Visita hospitalar', unit_price: 100, quantity: 3 },
      { tuss_code: '40301010', description: 'Hemograma completo', unit_price: 25, quantity: 2 },
    ],
  },
  {
    account_type: 'ambulatorial',
    status: 'glosa',
    procedures: [
      { tuss_code: '10101012', description: 'Consulta em consultório', unit_price: 150, quantity: 1 },
      { tuss_code: '40302105', description: 'Ureia', unit_price: 15, quantity: 1 },
      { tuss_code: '40302113', description: 'Creatinina', unit_price: 15, quantity: 1 },
    ],
    glosa: {
      code: 'M20',
      description: 'Procedimento não coberto pelo plano',
      amount: 30,
    },
  },
];

async function seedData() {
  console.log('═'.repeat(60));
  console.log('  FinHealth Squad - Seed Test Data');
  console.log('═'.repeat(60));

  const supabase = getSupabaseClient();

  // 1. Seed health insurers
  console.log('\n📦 Seeding health insurers...');

  for (const insurer of HEALTH_INSURERS) {
    const { data: existing } = await supabase
      .from('health_insurers')
      .select('id')
      .eq('ans_code', insurer.ans_code)
      .single();

    if (!existing) {
      const { error } = await supabase.from('health_insurers').insert(insurer);
      if (error) {
        console.error(`  ❌ Error creating ${insurer.name}:`, error.message);
      } else {
        console.log(`  ✓ Created: ${insurer.name} (${insurer.ans_code})`);
      }
    } else {
      console.log(`  - Exists: ${insurer.name}`);
    }
  }

  // Get insurer IDs
  const { data: insurers } = await supabase
    .from('health_insurers')
    .select('id, ans_code');

  // 2. Seed patients
  console.log('\n👥 Seeding patients...');

  for (const patient of PATIENTS) {
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('external_id', patient.external_id)
      .single();

    if (!existing) {
      const insurerId = insurers?.[Math.floor(Math.random() * insurers.length)]?.id;

      const { error } = await supabase.from('patients').insert({
        ...patient,
        health_insurance_id: insurerId,
      });

      if (error) {
        console.error(`  ❌ Error creating ${patient.name}:`, error.message);
      } else {
        console.log(`  ✓ Created: ${patient.name}`);
      }
    } else {
      console.log(`  - Exists: ${patient.name}`);
    }
  }

  // Get patient IDs
  const { data: patients } = await supabase.from('patients').select('id, external_id');

  // 3. Seed medical accounts
  console.log('\n📋 Seeding medical accounts...');

  let accountCount = 0;
  for (const accountData of MEDICAL_ACCOUNTS) {
    for (const patient of patients || []) {
      accountCount++;
      const accountNumber = `ACC-SEED-${String(accountCount).padStart(4, '0')}`;

      const { data: existing } = await supabase
        .from('medical_accounts')
        .select('id')
        .eq('account_number', accountNumber)
        .single();

      if (existing) {
        console.log(`  - Exists: ${accountNumber}`);
        continue;
      }

      const totalAmount = accountData.procedures.reduce(
        (sum, p) => sum + p.unit_price * p.quantity,
        0
      );

      const insurerId = insurers?.[Math.floor(Math.random() * insurers.length)]?.id;

      // Create account
      const { data: account, error } = await supabase
        .from('medical_accounts')
        .insert({
          account_number: accountNumber,
          patient_id: patient.id,
          health_insurer_id: insurerId,
          account_type: accountData.account_type,
          status: accountData.status,
          total_amount: totalAmount,
          approved_amount: accountData.status === 'validated' ? totalAmount : 0,
          glosa_amount: accountData.glosa?.amount || 0,
          paid_amount: 0,
          metadata: { seeded: true },
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  ❌ Error creating ${accountNumber}:`, error.message);
        continue;
      }

      console.log(`  ✓ Created: ${accountNumber} (${accountData.account_type})`);

      // Create procedures
      for (const proc of accountData.procedures) {
        await supabase.from('procedures').insert({
          medical_account_id: account.id,
          tuss_code: proc.tuss_code,
          description: proc.description,
          quantity: proc.quantity,
          unit_price: proc.unit_price,
          total_price: proc.unit_price * proc.quantity,
          performed_at: new Date().toISOString(),
          status: 'pending',
          metadata: {},
        });
      }

      // Create glosa if present
      if (accountData.glosa) {
        await supabase.from('glosas').insert({
          medical_account_id: account.id,
          glosa_code: accountData.glosa.code,
          glosa_description: accountData.glosa.description,
          glosa_type: 'administrativa',
          original_amount: totalAmount,
          glosa_amount: accountData.glosa.amount,
          appeal_status: 'pending',
        });
      }
    }
  }

  // Summary
  const { count: insurerCount } = await supabase
    .from('health_insurers')
    .select('*', { count: 'exact', head: true });

  const { count: patientCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  const { count: accountCountDb } = await supabase
    .from('medical_accounts')
    .select('*', { count: 'exact', head: true });

  const { count: procedureCount } = await supabase
    .from('procedures')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '═'.repeat(60));
  console.log('  Seed Complete!');
  console.log('═'.repeat(60));
  console.log(`\n  Health Insurers: ${insurerCount}`);
  console.log(`  Patients: ${patientCount}`);
  console.log(`  Medical Accounts: ${accountCountDb}`);
  console.log(`  Procedures: ${procedureCount}`);
  console.log('\n  You can now run the billing agent example:');
  console.log('    npx ts-node examples/run-billing-agent.ts');
}

seedData().catch(console.error);
