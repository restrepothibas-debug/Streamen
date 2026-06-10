export interface Account {
    id: string;
    service: string;
    email: string;
    password?: string;
    profiles_total: number;
    assigned_profiles: number;
    provider?: string;
    expiration: string;
    status: 'Activa' | 'Hogar Bloqueado' | 'Cambiar Clave' | 'Vencida';
    created_at?: string;
}
export interface Customer {
    id: string;
    name: string;
    phone: string;
    service: string;
    account_id: string;
    profile_detail: string;
    paid_amount: number;
    expiration: string;
    created_at?: string;
}
export interface Incident {
    id: string;
    customer_id: string;
    account_id: string;
    issue: string;
    severity: 'Baja' | 'Media' | 'Alta';
    status: 'Abierto' | 'Resuelto';
    created_at?: string;
    customer_name?: string;
    service_name?: string;
    account_email?: string;
}
//# sourceMappingURL=index.d.ts.map