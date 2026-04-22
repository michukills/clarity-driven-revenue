import type { BccDataset } from "./types";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return iso(d);
};

/** Sample dataset used when no real records exist. Marked with __sample__ ids. */
export const SAMPLE_DATASET: BccDataset = {
  revenue: [
    { id: "s1", customer_id: "sample", period_id: null, entry_date: day(-25), amount: 4800, service_category: "Consulting Retainer", client_or_job: "Northwind Co.", revenue_type: "recurring", status: "collected", source_channel: "Referral", notes: null },
    { id: "s2", customer_id: "sample", period_id: null, entry_date: day(-18), amount: 3200, service_category: "Implementation", client_or_job: "Atlas Group", revenue_type: "one_time", status: "collected", source_channel: "Inbound", notes: null },
    { id: "s3", customer_id: "sample", period_id: null, entry_date: day(-12), amount: 6500, service_category: "Implementation", client_or_job: "Riverstone", revenue_type: "one_time", status: "pending", source_channel: "Outbound", notes: null },
    { id: "s4", customer_id: "sample", period_id: null, entry_date: day(-5), amount: 1800, service_category: "Consulting Retainer", client_or_job: "Northwind Co.", revenue_type: "recurring", status: "overdue", source_channel: "Referral", notes: "Awaiting PO" },
  ],
  expenses: [
    { id: "e1", customer_id: "sample", period_id: null, entry_date: day(-20), amount: 1200, category_id: null, vendor: "Software Stack", expense_type: "fixed", payment_status: "paid", notes: null, category_name: "Software" },
    { id: "e2", customer_id: "sample", period_id: null, entry_date: day(-15), amount: 850, category_id: null, vendor: "Office Lease", expense_type: "fixed", payment_status: "paid", notes: null, category_name: "Rent" },
    { id: "e3", customer_id: "sample", period_id: null, entry_date: day(-10), amount: 1450, category_id: null, vendor: "Ad Platform", expense_type: "variable", payment_status: "paid", notes: null, category_name: "Marketing" },
    { id: "e4", customer_id: "sample", period_id: null, entry_date: day(-3), amount: 600, category_id: null, vendor: "Contract Designer", expense_type: "variable", payment_status: "pending", notes: null, category_name: "Contractors" },
  ],
  payroll: [
    { id: "p1", customer_id: "sample", period_id: null, pay_period_start: day(-30), pay_period_end: day(-16), person_name: "Owner", role: "Founder", gross_pay: 5000, payroll_taxes_fees: 0, total_payroll_cost: 5000, hours_worked: 80, labor_type: "owner_draw", notes: null },
    { id: "p2", customer_id: "sample", period_id: null, pay_period_start: day(-30), pay_period_end: day(-16), person_name: "A. Rivera", role: "Operations Lead", gross_pay: 3800, payroll_taxes_fees: 540, total_payroll_cost: 4340, hours_worked: 80, labor_type: "employee", notes: null },
  ],
  labor: [
    { id: "l1", customer_id: "sample", period_id: null, entry_date: day(-12), person_name: "A. Rivera", role: "Operations Lead", job_or_project: "Riverstone Implementation", service_category: "Implementation", hours_worked: 22, labor_cost: 1320, billable_status: "billable", notes: null },
    { id: "l2", customer_id: "sample", period_id: null, entry_date: day(-8), person_name: "Owner", role: "Founder", job_or_project: "Internal Ops", service_category: null, hours_worked: 12, labor_cost: 750, billable_status: "non_billable", notes: null },
  ],
  invoices: [
    { id: "i1", customer_id: "sample", period_id: null, invoice_number: "INV-1042", invoice_date: day(-22), due_date: day(-7), client_or_job: "Riverstone", amount: 6500, amount_collected: 0, status: "overdue", notes: null },
    { id: "i2", customer_id: "sample", period_id: null, invoice_number: "INV-1043", invoice_date: day(-10), due_date: day(20), client_or_job: "Northwind Co.", amount: 4800, amount_collected: 4800, status: "paid", notes: null },
    { id: "i3", customer_id: "sample", period_id: null, invoice_number: "INV-1044", invoice_date: day(-5), due_date: day(25), client_or_job: "Atlas Group", amount: 3200, amount_collected: 1600, status: "partially_paid", notes: null },
  ],
  cashflow: [
    { id: "c1", customer_id: "sample", period_id: null, entry_date: day(-20), amount: 4800, direction: "cash_in", category: "Client payment", description: "Northwind retainer", expected_or_actual: "actual", notes: null },
    { id: "c2", customer_id: "sample", period_id: null, entry_date: day(-15), amount: 850, direction: "cash_out", category: "Rent", description: "Office", expected_or_actual: "actual", notes: null },
    { id: "c3", customer_id: "sample", period_id: null, entry_date: day(-10), amount: 1450, direction: "cash_out", category: "Marketing", description: "Ad spend", expected_or_actual: "actual", notes: null },
    { id: "c4", customer_id: "sample", period_id: null, entry_date: day(-2), amount: 9340, direction: "cash_out", category: "Payroll", description: "Bi-weekly payroll", expected_or_actual: "actual", notes: null },
    { id: "c5", customer_id: "sample", period_id: null, entry_date: day(15), amount: 1600, direction: "cash_in", category: "Receivable", description: "Atlas remaining", expected_or_actual: "expected", notes: null },
  ],
  goals: [
    { id: "g1", customer_id: "sample", period_id: null, goal_type: "revenue", target_value: 18000, current_value: 16300, goal_label: "Monthly revenue", status: "at_risk", notes: null },
    { id: "g2", customer_id: "sample", period_id: null, goal_type: "profit_margin", target_value: 20, current_value: 12, goal_label: "Net margin %", status: "at_risk", notes: null },
  ],
};