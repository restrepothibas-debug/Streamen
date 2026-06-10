import { supabase } from '../lib/supabase';
import { Incident } from '../types/index.ts';

export const incidentService = {
  async getAll(): Promise<Incident[]> {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        customers (name),
        accounts (email, service)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to flat object for easier UI binding
    return (data || []).map((inc: any) => ({
      ...inc,
      customer_name: inc.customers?.name,
      service_name: inc.accounts?.service,
      account_email: inc.accounts?.email
    }));
  },

  async create(incident: Omit<Incident, 'id' | 'created_at' | 'status'>): Promise<Incident> {
    const { data, error } = await supabase
      .from('incidents')
      .insert([incident])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async resolve(id: string): Promise<void> {
    const { error } = await supabase
      .from('incidents')
      .update({ status: 'Resuelto' })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
