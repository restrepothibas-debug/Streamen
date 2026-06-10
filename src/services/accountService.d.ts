import { Account } from '../types';
export declare const accountService: {
    getAll(): Promise<Account[]>;
    create(account: Omit<Account, "id" | "created_at">): Promise<Account>;
    update(id: string, updates: Partial<Account>): Promise<Account>;
    delete(id: string): Promise<void>;
};
//# sourceMappingURL=accountService.d.ts.map