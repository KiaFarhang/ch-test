import { CustomerData } from '../api';
export interface CustomerTableRow extends CustomerData {
    subscriptionDate: Date;
}

const mockDatabase = () => {
    const rows: CustomerTableRow[] = [];

    return {
        insert(data: CustomerData): void {
            rows.push(Object.assign({}, data, { subscriptionDate: new Date() }));
        },
        selectAll(): CustomerTableRow[] {
            return rows;
        },
        clear(): void {
            rows.length = 0;
        }
    }
}

export default mockDatabase();