import { Incident } from '../types';
export declare const incidentService: {
    getAll(): Promise<Incident[]>;
    create(incident: Omit<Incident, "id" | "created_at" | "status">): Promise<Incident>;
    resolve(id: string): Promise<void>;
    delete(id: string): Promise<void>;
};
//# sourceMappingURL=incidentService.d.ts.map