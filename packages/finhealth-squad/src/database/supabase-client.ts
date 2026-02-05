/**
 * Supabase Client Configuration
 * FinHealth Squad - Database Layer
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Database types
export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Patient, 'id'>>;
      };
      health_insurers: {
        Row: HealthInsurer;
        Insert: Omit<HealthInsurer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<HealthInsurer, 'id'>>;
      };
      medical_accounts: {
        Row: MedicalAccount;
        Insert: Omit<MedicalAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MedicalAccount, 'id'>>;
      };
      procedures: {
        Row: Procedure;
        Insert: Omit<Procedure, 'id' | 'created_at'>;
        Update: Partial<Omit<Procedure, 'id'>>;
      };
      glosas: {
        Row: Glosa;
        Insert: Omit<Glosa, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Glosa, 'id'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Omit<Payment, 'id'>>;
      };
    };
  };
}

// Entity types
export interface Patient {
  id: string;
  external_id?: string;
  name: string;
  cpf?: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: Record<string, any>;
  health_insurance_id?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthInsurer {
  id: string;
  ans_code: string;
  name: string;
  cnpj?: string;
  tiss_version: string;
  contact_email?: string;
  api_endpoint?: string;
  config: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalAccount {
  id: string;
  account_number: string;
  patient_id?: string;
  health_insurer_id?: string;
  admission_date?: string;
  discharge_date?: string;
  account_type: 'internacao' | 'ambulatorial' | 'sadt' | 'honorarios';
  status: 'pending' | 'validated' | 'sent' | 'paid' | 'glosa' | 'appeal';
  total_amount: number;
  approved_amount: number;
  glosa_amount: number;
  paid_amount: number;
  tiss_guide_number?: string;
  tiss_guide_type?: string;
  tiss_xml?: string;
  tiss_validation_status?: string;
  tiss_validation_errors?: Record<string, any>;
  audit_score?: number;
  glosa_risk_score?: number;
  audit_issues?: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  paid_at?: string;
}

export interface Procedure {
  id: string;
  medical_account_id: string;
  tuss_code?: string;
  sigtap_code?: string;
  cbhpm_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  performed_at?: string;
  professional_id?: string;
  professional_name?: string;
  professional_council?: string;
  status: string;
  glosa_code?: string;
  glosa_reason?: string;
  appeal_status?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Glosa {
  id: string;
  medical_account_id: string;
  procedure_id?: string;
  glosa_code: string;
  glosa_description?: string;
  glosa_type?: 'administrativa' | 'tecnica' | 'linear';
  original_amount: number;
  glosa_amount: number;
  appeal_status: 'pending' | 'in_progress' | 'sent' | 'accepted' | 'rejected';
  appeal_text?: string;
  appeal_sent_at?: string;
  appeal_response?: string;
  appeal_resolved_at?: string;
  ai_recommendation?: string;
  success_probability?: number;
  priority_score?: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  health_insurer_id: string;
  payment_date: string;
  payment_reference?: string;
  bank_account?: string;
  total_amount: number;
  matched_amount: number;
  unmatched_amount: number;
  reconciliation_status: string;
  reconciled_at?: string;
  payment_file_url?: string;
  payment_file_type?: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Singleton client instance
let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variables.'
    );
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Database repository class for medical accounts
 */
export class MedicalAccountRepository {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = getSupabaseClient();
  }

  async findById(id: string): Promise<MedicalAccount | null> {
    const { data, error } = await this.client
      .from('medical_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async findByAccountNumber(accountNumber: string): Promise<MedicalAccount | null> {
    const { data, error } = await this.client
      .from('medical_accounts')
      .select('*')
      .eq('account_number', accountNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findPendingAccounts(limit = 100): Promise<MedicalAccount[]> {
    const { data, error } = await this.client
      .from('medical_accounts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async create(account: Omit<MedicalAccount, 'id' | 'created_at' | 'updated_at'>): Promise<MedicalAccount> {
    const { data, error } = await this.client
      .from('medical_accounts')
      .insert(account)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<MedicalAccount>): Promise<MedicalAccount> {
    const { data, error } = await this.client
      .from('medical_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTissValidation(
    id: string,
    status: string,
    errors?: Record<string, any>
  ): Promise<MedicalAccount> {
    return this.update(id, {
      tiss_validation_status: status,
      tiss_validation_errors: errors,
      status: status === 'valid' ? 'validated' : 'pending',
    });
  }

  async updateAuditScore(
    id: string,
    auditScore: number,
    glosaRiskScore: number,
    issues?: Record<string, any>
  ): Promise<MedicalAccount> {
    return this.update(id, {
      audit_score: auditScore,
      glosa_risk_score: glosaRiskScore,
      audit_issues: issues,
    });
  }
}

/**
 * Database repository class for procedures
 */
export class ProcedureRepository {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = getSupabaseClient();
  }

  async findByAccountId(accountId: string): Promise<Procedure[]> {
    const { data, error } = await this.client
      .from('procedures')
      .select('*')
      .eq('medical_account_id', accountId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async create(procedure: Omit<Procedure, 'id' | 'created_at'>): Promise<Procedure> {
    const { data, error } = await this.client
      .from('procedures')
      .insert(procedure)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createMany(procedures: Omit<Procedure, 'id' | 'created_at'>[]): Promise<Procedure[]> {
    const { data, error } = await this.client
      .from('procedures')
      .insert(procedures)
      .select();

    if (error) throw error;
    return data || [];
  }
}

/**
 * Database repository class for glosas
 */
export class GlosaRepository {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = getSupabaseClient();
  }

  async findByAccountId(accountId: string): Promise<Glosa[]> {
    const { data, error } = await this.client
      .from('glosas')
      .select('*')
      .eq('medical_account_id', accountId)
      .order('priority_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findPendingAppeals(limit = 50): Promise<Glosa[]> {
    const { data, error } = await this.client
      .from('glosas')
      .select('*')
      .eq('appeal_status', 'pending')
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async create(glosa: Omit<Glosa, 'id' | 'created_at' | 'updated_at'>): Promise<Glosa> {
    const { data, error } = await this.client
      .from('glosas')
      .insert(glosa)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAppeal(id: string, appealText: string, status: string): Promise<Glosa> {
    const { data, error } = await this.client
      .from('glosas')
      .update({
        appeal_text: appealText,
        appeal_status: status,
        appeal_sent_at: status === 'sent' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default getSupabaseClient;
