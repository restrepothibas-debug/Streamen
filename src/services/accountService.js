import { supabase } from '../lib/supabase';
import { Account } from '../types';
export const accountService = {
    async getAll() {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    },
    async create(account) {
        const { data, error } = await supabase
            .from('accounts')
            .insert([account])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async update(id, updates) {
        const { data, error } = await supabase
            .from('accounts')
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
            .from('accounts')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
};
//# sourceMappingURL=accountService.js.map