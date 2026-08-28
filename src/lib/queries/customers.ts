import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Bill, Customer, Payment } from '../../types/db'

const CUSTOMERS_KEY = ['customers'] as const

export interface CustomerWithBalance extends Customer {
  balance: number
}

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async (): Promise<CustomerWithBalance[]> => {
      const [{ data: customers, error: customersError }, { data: bills, error: billsError }, { data: payments, error: paymentsError }] =
        await Promise.all([
          supabase.from('customers').select('*'),
          supabase.from('bills').select('customer_id, total, amount_paid').not('customer_id', 'is', null),
          supabase.from('payments').select('customer_id, amount'),
        ])
      if (customersError) throw customersError
      if (billsError) throw billsError
      if (paymentsError) throw paymentsError

      const owed = new Map<string, number>()
      for (const bill of bills ?? []) {
        const id = bill.customer_id as string
        owed.set(id, (owed.get(id) ?? 0) + (bill.total - bill.amount_paid))
      }
      for (const payment of payments ?? []) {
        owed.set(payment.customer_id, (owed.get(payment.customer_id) ?? 0) - payment.amount)
      }

      return (customers ?? []).map((c) => ({ ...c, balance: owed.get(c.id) ?? 0 })) as CustomerWithBalance[]
    },
  })
}

export interface CustomerDetail {
  customer: Customer
  bills: Bill[]
  payments: Payment[]
  balance: number
}

export function useCustomerDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, id],
    queryFn: async (): Promise<CustomerDetail> => {
      const [{ data: customer, error: customerError }, { data: bills, error: billsError }, { data: payments, error: paymentsError }] =
        await Promise.all([
          supabase.from('customers').select('*').eq('id', id as string).single(),
          supabase
            .from('bills')
            .select('*')
            .eq('customer_id', id as string)
            .order('created_at', { ascending: false }),
          supabase
            .from('payments')
            .select('*')
            .eq('customer_id', id as string)
            .order('created_at', { ascending: false }),
        ])
      if (customerError) throw customerError
      if (billsError) throw billsError
      if (paymentsError) throw paymentsError

      const owedFromBills = (bills ?? []).reduce((sum, b) => sum + (b.total - b.amount_paid), 0)
      const paid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)

      return {
        customer: customer as Customer,
        bills: (bills ?? []) as Bill[],
        payments: (payments ?? []) as Payment[],
        balance: owedFromBills - paid,
      }
    },
    enabled: !!id,
  })
}

export interface CustomerInput {
  name: string
  phone: string | null
  address: string | null
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CustomerInput): Promise<Customer> => {
      const { data, error } = await supabase.from('customers').insert(input).select('*').single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      customerId,
      amount,
      note,
    }: {
      customerId: string
      amount: number
      note: string | null
    }) => {
      const { error } = await supabase.from('payments').insert({ customer_id: customerId, amount, note })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  })
}
