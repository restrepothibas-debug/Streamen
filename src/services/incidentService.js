import { supabase } from '../lib/supabase';
import { Incident } from '../types';
export const incidentService = {
    async getAll() {
        const { data, error } = await supabase
            .from('incidents')
            .select(`
        *,
        customers (name),
        accounts (email, service)
      `)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        // Transform to flat object for easier UI binding
        return (data || []).map((inc) => ({
            ...inc,
            customer_name: inc.customers?.name,
            service_name: inc.accounts?.service,
            account_email: inc.accounts?.email
        }));
    },
    async create(incident) {
        const { data, error } = await supabase
            .from('incidents')
            .insert([incident])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async resolve(id) {
        const { error } = await supabase
            .from('incidents')
            .update({ status: 'Resuelto' })
            .eq('id', id);
        if (error)
            throw error;
    },
    async delete(id) {
        const { error } = await supabase
            .from('incidents')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
};
//# sourceMappingURL=incidentService.js.map