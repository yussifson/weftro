import { useState, useCallback } from 'react';
import { usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';

export function useLawFirmFeatures() {
    const powerSync = usePowerSync();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- TIME TRACKING ---
    const addTimeEntry = useCallback(async (entry) => {
        setLoading(true);
        setError(null);
        try {
            const id = uuidv4();
            await powerSync.execute(`
                INSERT INTO time_entries (id, company_id, case_id, user_id, user_name, description, hours, rate_per_hour, is_billable, entry_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                entry.company_id,
                entry.case_id,
                entry.user_id,
                entry.user_name,
                entry.description,
                entry.hours,
                entry.rate_per_hour,
                entry.is_billable ? 1 : 0,
                entry.entry_date || new Date().toISOString().split('T')[0]
            ]);
            return id;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [powerSync]);

    const getUnbilledTime = useCallback(async (company_id) => {
        setLoading(true);
        try {
            const result = await powerSync.getAll(`
                SELECT * FROM time_entries 
                WHERE company_id = ? AND is_billed = 0
            `, [company_id]);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [powerSync]);

    // --- TRUST ACCOUNTS ---
    const addTrustTransaction = useCallback(async (transaction) => {
        setLoading(true);
        setError(null);
        try {
            // First check balance if withdrawal
            if (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'disbursement') {
                const acc = await powerSync.get(`SELECT balance FROM trust_accounts WHERE id = ?`, [transaction.trust_account_id]);
                if (!acc || acc.balance < transaction.amount) {
                    throw new Error("Insufficient trust funds");
                }
            }

            const newBalance = transaction.transaction_type === 'deposit' 
                ? `balance + ${transaction.amount}` 
                : `balance - ${transaction.amount}`;

            await powerSync.execute(`
                UPDATE trust_accounts SET balance = ${newBalance} WHERE id = ?
            `, [transaction.trust_account_id]);

            const finalAcc = await powerSync.get(`SELECT balance FROM trust_accounts WHERE id = ?`, [transaction.trust_account_id]);

            const id = uuidv4();
            await powerSync.execute(`
                INSERT INTO trust_transactions (id, company_id, trust_account_id, transaction_type, amount, description, reference, balance_after, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                transaction.company_id,
                transaction.trust_account_id,
                transaction.transaction_type,
                transaction.amount,
                transaction.description,
                transaction.reference || null,
                finalAcc.balance,
                transaction.created_by
            ]);
            return id;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [powerSync]);

    // --- COURT HEARINGS ---
    const scheduleHearing = useCallback(async (hearing) => {
        setLoading(true);
        setError(null);
        try {
            const id = uuidv4();
            await powerSync.execute(`
                INSERT INTO court_hearings (id, company_id, case_id, hearing_type, hearing_date, court_name, courtroom, judge_name, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
            `, [
                id,
                hearing.company_id,
                hearing.case_id,
                hearing.hearing_type,
                hearing.hearing_date,
                hearing.court_name,
                hearing.courtroom,
                hearing.judge_name,
                hearing.notes
            ]);
            return id;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [powerSync]);

    return {
        loading,
        error,
        addTimeEntry,
        getUnbilledTime,
        addTrustTransaction,
        scheduleHearing
    };
}
