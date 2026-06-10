import { supabase } from '../lib/supabase';
import { Customer } from '../types';
export const customerService = {
    async getAll() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    },
    async create(customer) {
        const { data, error } = await supabase
            .from('customers')
            .insert([customer])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async update(id, updates) {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async delete(id) {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
};
//# sourceMappingURL=customerService.js.map