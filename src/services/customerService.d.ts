import { Customer } from '../types';
export declare const customerService: {
    getAll(): Promise<Customer[]>;
    create(customer: Omit<Customer, "id" | "created_at">): Promise<Customer>;
    update(id: string, updates: Partial<Customer>): Promise<Customer>;
    delete(id: string): Promise<void>;
};
//# sourceMappingURL=customerService.d.ts.map