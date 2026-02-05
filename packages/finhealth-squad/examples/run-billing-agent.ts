/**
 * Example: Run Billing Agent
 * FinHealth Squad
 *
 * This example demonstrates how to:
 * 1. Initialize the agent runtime
 * 2. Create a test medical account in Supabase
 * 3. Execute the billing-agent to validate TISS and generate guides
 *
 * Prerequisites:
 * - Set up Supabase project and run schema.sql
 * - Configure .env with SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
 *
 * Run:
 *   npx ts-node examples/run-billing-agent.ts
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

import { createRuntime, AgentRuntime } from '../src/runtime/agent-runtime';
import { BillingAgent } from '../src/agents/billing-agent';
import {
  getSupabaseClient,
  MedicalAccountRepository,
  ProcedureRepository,
  MedicalAccount,
} from '../src/database/supabase-client';

// Test data
const TEST_PATIENT = {
  external_id: 'PAT-TEST-001',
  name: 'Maria Silva Santos',
  cpf: '123.456.789-00',
  birth_date: '1985-03-15',
  gender: 'F',
  phone: '(11) 98765-4321',
  email: 'maria.santos@email.com',
};

const TEST_PROCEDURES = [
  {
    tuss_code: '10101012',
    description: 'Consulta em consultorio (no horario normal ou preestabelecido)',
    quantity: 1,
    unit_price: 150.0,
    total_price: 150.0,
    performed_at: new Date().toISOString(),
    professional_name: 'Dr. João Silva',
    professional_council: 'CRM',
    status: 'pending',
    metadata: {},
  },
  {
    tuss_code: '40301010',
    description: 'Hemograma completo',
    quantity: 1,
    unit_price: 25.0,
    total_price: 25.0,
    performed_at: new Date().toISOString(),
    professional_name: 'Lab Central',
    status: 'pending',
    metadata: {},
  },
  {
    tuss_code: '40302040',
    description: 'Glicose',
    quantity: 1,
    unit_price: 12.0,
    total_price: 12.0,
    performed_at: new Date().toISOString(),
    professional_name: 'Lab Central',
    status: 'pending',
    metadata: {},
  },
  {
    tuss_code: '40302105',
    description: 'Ureia',
    quantity: 1,
    unit_price: 15.0,
    total_price: 15.0,
    performed_at: new Date().toISOString(),
    professional_name: 'Lab Central',
    status: 'pending',
    metadata: {},
  },
  {
    tuss_code: '40302113',
    description: 'Creatinina',
    quantity: 1,
    unit_price: 15.0,
    total_price: 15.0,
    performed_at: new Date().toISOString(),
    professional_name: 'Lab Central',
    status: 'pending',
    metadata: {},
  },
];

/**
 * Create test data in database
 */
async function createTestData(): Promise<MedicalAccount> {
  console.log('\n📦 Creating test data in Supabase...\n');

  const supabase = getSupabaseClient();

  // Create or get test patient
  const { data: existingPatient } = await supabase
    .from('patients')
    .select('id')
    .eq('external_id', TEST_PATIENT.external_id)
    .single();

  let patientId: string;

  if (existingPatient) {
    patientId = existingPatient.id;
    console.log(`  ✓ Using existing patient: ${patientId}`);
  } else {
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert(TEST_PATIENT)
      .select('id')
      .single();

    if (error) throw error;
    patientId = newPatient.id;
    console.log(`  ✓ Created patient: ${patientId}`);
  }

  // Create medical account
  const accountNumber = `ACC-${Date.now()}`;
  const accountRepo = new MedicalAccountRepository();

  const account = await accountRepo.create({
    account_number: accountNumber,
    patient_id: patientId,
    account_type: 'ambulatorial',
    status: 'pending',
    total_amount: TEST_PROCEDURES.reduce((sum, p) => sum + p.total_price, 0),
    approved_amount: 0,
    glosa_amount: 0,
    paid_amount: 0,
    metadata: {
      test: true,
      created_by: 'run-billing-agent.ts',
    },
  });

  console.log(`  ✓ Created medical account: ${account.account_number}`);

  // Create procedures
  const procedureRepo = new ProcedureRepository();
  const procedures = await procedureRepo.createMany(
    TEST_PROCEDURES.map(p => ({
      ...p,
      medical_account_id: account.id,
    }))
  );

  console.log(`  ✓ Created ${procedures.length} procedures`);
  console.log(`  ✓ Total amount: R$ ${account.total_amount.toFixed(2)}`);

  return account;
}

/**
 * Run billing agent example
 */
async function runExample() {
  console.log('═'.repeat(60));
  console.log('  FinHealth Squad - Billing Agent Example');
  console.log('═'.repeat(60));

  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.OPENAI_API_KEY) {
    console.error('\n❌ Error: Missing environment variables');
    console.error('   Please copy .env.example to .env and configure:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY');
    console.error('   - OPENAI_API_KEY');
    process.exit(1);
  }

  try {
    // Step 1: Create test data
    const account = await createTestData();

    // Step 2: Initialize runtime
    console.log('\n🚀 Initializing Agent Runtime...\n');

    const runtime = await createRuntime({
      squadPath: path.join(__dirname, '..'),
      verbose: true,
    });

    console.log(`  ✓ Loaded agents: ${runtime.listAgents().join(', ')}`);

    // Step 3: Initialize billing agent
    const billingAgent = new BillingAgent(runtime);

    // Step 4: Generate TISS guide
    console.log('\n📝 Generating TISS Guide...\n');

    const generateResult = await billingAgent.generateTissGuide({
      accountId: account.id,
      guideType: 'sadt',
    });

    if (generateResult.success) {
      console.log(`  ✓ Guide generated successfully!`);
      console.log(`    - Guide Number: ${generateResult.output.guideNumber}`);
      console.log(`    - Guide Type: ${generateResult.output.guideType}`);
      console.log(`    - Procedures: ${generateResult.output.procedureCount}`);
      console.log(`    - Total Amount: R$ ${generateResult.output.totalAmount.toFixed(2)}`);
      console.log(`    - XML Length: ${generateResult.output.xml.length} chars`);
    } else {
      console.error('  ❌ Generation failed:', generateResult.errors);
    }

    // Step 5: Validate TISS
    console.log('\n🔍 Validating TISS Guide...\n');

    const validateResult = await billingAgent.validateTiss({
      accountId: account.id,
      schemaVersion: '3.05.00',
    });

    if (validateResult.success) {
      const validation = validateResult.output;
      console.log(`  ✓ Validation complete!`);
      console.log(`    - Is Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`);
      console.log(`    - Procedures: ${validation.procedureCount}`);

      if (validation.errors?.length > 0) {
        console.log(`    - Errors:`);
        validation.errors.forEach((e: string) => console.log(`      ❌ ${e}`));
      }

      if (validation.warnings?.length > 0) {
        console.log(`    - Warnings:`);
        validation.warnings.forEach((w: string) => console.log(`      ⚠️  ${w}`));
      }

      if (validation.aiAnalysis) {
        console.log(`    - AI Analysis: ${validation.aiAnalysis}`);
      }
    } else {
      console.error('  ❌ Validation failed:', validateResult.errors);
    }

    // Step 6: Execute via runtime (alternative method)
    console.log('\n🤖 Executing task via Agent Runtime...\n');

    const runtimeResult = await runtime.executeTask({
      taskName: 'analyze-billing',
      agentId: 'billing-agent',
      parameters: {
        accountNumber: account.account_number,
        totalAmount: account.total_amount,
        procedureCount: TEST_PROCEDURES.length,
        procedures: TEST_PROCEDURES.map(p => ({
          code: p.tuss_code,
          description: p.description,
          value: p.total_price,
        })),
      },
      context: {
        schemaVersion: '3.05.00',
        insurerType: 'private',
      },
    });

    if (runtimeResult.success) {
      console.log('  ✓ Runtime execution complete!');
      console.log('    - Output:', JSON.stringify(runtimeResult.output, null, 2).substring(0, 500));
      console.log('    - Metadata:', runtimeResult.metadata);
    } else {
      console.error('  ❌ Runtime execution failed:', runtimeResult.errors);
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('  Example Complete!');
    console.log('═'.repeat(60));
    console.log(`\n  Account ID: ${account.id}`);
    console.log(`  Account Number: ${account.account_number}`);
    console.log(`\n  You can now use this account in the AIOS CLI:`);
    console.log(`    @billing-agent *validate-tiss --accountId ${account.id}`);
    console.log(`    @billing-agent *generate-tiss-guide --accountId ${account.id}`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the example
runExample();
