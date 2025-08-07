// --- Simple Test Utility ---
const testResults = [];
let testsRun = 0;
let testsPassed = 0;

function assertEquals(expected, actual, message) {
    testsRun++;
    if (JSON.stringify(expected) === JSON.stringify(actual)) { // Using JSON.stringify for deep object/array comparison
        testsPassed++;
        testResults.push({ name: message, pass: true });
    } else {
        testResults.push({
            name: message,
            pass: false,
            expected: JSON.stringify(expected),
            actual: JSON.stringify(actual)
        });
        console.error(`FAIL: ${message} - Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
    }
}

function assertTrue(condition, message) {
    testsRun++;
    if (condition) {
        testsPassed++;
        testResults.push({ name: message, pass: true });
    } else {
        testResults.push({ name: message, pass: false, expected: "true", actual: "false" });
        console.error(`FAIL: ${message} - Expected: true, Actual: false`);
    }
}


function runTest(testName, testFunction) {
    console.log(`\n--- Running Test: ${testName} ---`);
    try {
        testFunction();
    } catch (e) {
        testsRun++; // Count it as a run even if it throws an error internally
        testResults.push({ name: testName + " (Execution Error)", pass: false, error: e.toString() });
        console.error(`ERROR in test "${testName}": ${e.stack}`);
    }
}

function summarizeTests() {
    console.log("\n\n--- Test Summary ---");
    testResults.forEach(result => {
        if (result.pass) {
            // console.log(`PASS: ${result.name}`); // Already logged or too verbose
        } else {
            if (result.error) {
                console.error(`FAIL: ${result.name} - Error: ${result.error}`);
            } else {
                // Detailed error already logged by assertEquals
            }
        }
    });
    console.log(`\nTotal Tests: ${testsRun}, Passed: ${testsPassed}, Failed: ${testsRun - testsPassed}`);
    if (testsRun !== testsPassed) {
        console.error("\nSOME TESTS FAILED!");
    } else {
        console.log("\nALL TESTS PASSED!");
    }
}

// --- Functions copied from app.js (or stubs if too complex and not directly tested) ---
// These are needed for calculateCashFlowData and the date helpers themselves.

const MONTH_NAMES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function addMonths(date, months) { const d = new Date(date.getTime()); d.setUTCMonth(d.getUTCMonth() + months); return d; }
function addWeeks(date, weeks) { const d = new Date(date.getTime()); d.setUTCDate(d.getUTCDate() + (weeks * 7)); return d; }
function getISODateString(date) { if (!(date instanceof Date) || isNaN(date.getTime())) return ''; return date.getUTCFullYear() + '-' + ('0' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + date.getUTCDate()).slice(-2); }

// getWeekNumber and getMondayOfWeek are crucial for weekly periodicity.
function getWeekNumber(d) { 
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); 
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); 
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); 
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7); 
    return [date.getUTCFullYear(), weekNo]; 
}

function getMondayOfWeek(year, week) {
    // Create a date for Jan 4th of the year. Jan 4th is always in week 1.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    // Get the day of the week for Jan 4th (0=Sun, 1=Mon, ..., 6=Sat). Adjust Sunday to be 7 for ISO 8601 weekday.
    const jan4DayOfWeek = jan4.getUTCDay() || 7; 
    // Calculate the date of the first Monday of the year.
    const firstMondayOfYear = new Date(jan4.getTime());
    firstMondayOfYear.setUTCDate(jan4.getUTCDate() - (jan4DayOfWeek - 1));

    // Add (week - 1) * 7 days to the first Monday to get the Monday of the target week.
    const targetMonday = new Date(firstMondayOfYear.getTime());
    targetMonday.setUTCDate(firstMondayOfYear.getUTCDate() + (week - 1) * 7);
    return targetMonday;
}

function getDaysInMonth(year, month) { return new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); }

function getExpenseOccurrencesInPeriod(expense, pStart, pEnd, periodicity, useInstant) {
    if (!expense || !expense.start_date || !(pStart instanceof Date) || !(pEnd instanceof Date) || pStart > pEnd) return 0;
    const baseStart = useInstant && expense.movement_date ? new Date(expense.movement_date) : new Date(expense.start_date);
    let start = baseStart;
    let end = expense.end_date ? new Date(expense.end_date) : null;
    if (useInstant && expense.end_date && expense.movement_date) {
        const diff = new Date(expense.start_date).getTime() - new Date(expense.movement_date).getTime();
        end = new Date(new Date(expense.end_date).getTime() - diff);
    }
    const installments = parseInt(expense.installments || 1);
    let freq = expense.frequency || 'Mensual';
    if (installments > 1 && !useInstant) {
        freq = 'Mensual';
        end = addMonths(new Date(start), installments - 1);
    }

    if (freq === 'Único') {
        return (start >= pStart && start <= pEnd) ? 1 : 0;
    } else if (freq === 'Mensual') {
        if (start > pEnd || (end && end < pStart)) return 0;
        const payDay = start.getUTCDate();
        if (periodicity === 'Semanal') {
            const candidates = [];
            const monthsToCheck = new Set([
                `${pStart.getUTCFullYear()}-${pStart.getUTCMonth()}`,
                `${pEnd.getUTCFullYear()}-${pEnd.getUTCMonth()}`
            ]);
            monthsToCheck.forEach(key => {
                const [y, m] = key.split('-').map(n => parseInt(n));
                const daysInMonth = getDaysInMonth(y, m);
                candidates.push(new Date(Date.UTC(y, m, Math.min(payDay, daysInMonth))));
            });
            for (const payDate of candidates) {
                if (payDate >= pStart && payDate <= pEnd && start <= payDate && (!end || end >= payDate)) return 1;
            }
            return 0;
        } else {
            const year = pStart.getUTCFullYear();
            const month = pStart.getUTCMonth();
            const daysInMonth = getDaysInMonth(year, month);
            const payDate = new Date(Date.UTC(year, month, Math.min(payDay, daysInMonth)));
            return (payDate >= pStart && payDate <= pEnd && start <= payDate && (!end || end >= payDate)) ? 1 : 0;
        }
    } else if (freq === 'Semanal') {
        if (start > pEnd || (end && end < pStart)) return 0;
        if (periodicity === 'Semanal') {
            return 1;
        } else {
            let count = 0;
            const payDow = start.getUTCDay();
            let d = new Date(pStart.getTime());
            while (d <= pEnd) {
                if (d.getUTCDay() === payDow && d >= start && (!end || d <= end)) count++;
                d.setUTCDate(d.getUTCDate() + 1);
            }
            return count;
        }
    } else if (freq === 'Bi-semanal') {
        if (start > pEnd || (end && end < pStart)) return 0;
        let count = 0;
        let payDate = new Date(start.getTime());
        while (payDate < pStart) {
            payDate = addWeeks(payDate, 2);
            if (end && payDate > end) return count;
        }
        while (payDate <= pEnd) {
            if (!end || payDate <= end) count++;
            payDate = addWeeks(payDate, 2);
        }
        return count;
    }
    return 0;
}

function getExpenseOccurrenceDatesInPeriod(expense, pStart, pEnd, useInstant) {
    if (!expense || !expense.start_date || !(pStart instanceof Date) || !(pEnd instanceof Date) || pStart > pEnd) return [];
    const baseStart = useInstant && expense.movement_date ? new Date(expense.movement_date) : new Date(expense.start_date);
    let start = baseStart;
    let end = expense.end_date ? new Date(expense.end_date) : null;
    if (useInstant && expense.end_date && expense.movement_date) {
        const diff = new Date(expense.start_date).getTime() - new Date(expense.movement_date).getTime();
        end = new Date(new Date(expense.end_date).getTime() - diff);
    }
    const installments = parseInt(expense.installments || 1);
    let freq = expense.frequency || 'Mensual';
    if (installments > 1 && !useInstant) {
        freq = 'Mensual';
        end = addMonths(new Date(start), installments - 1);
    }

    const dates = [];

    if (freq === 'Único') {
        if (start >= pStart && start <= pEnd) dates.push(new Date(start));
    } else if (freq === 'Mensual') {
        if (start > pEnd || (end && end < pStart)) return [];
        const payDay = start.getUTCDate();
        const monthsToCheck = new Set();
        let iter = new Date(Date.UTC(pStart.getUTCFullYear(), pStart.getUTCMonth(), 1));
        while (iter <= pEnd) {
            monthsToCheck.add(`${iter.getUTCFullYear()}-${iter.getUTCMonth()}`);
            iter.setUTCMonth(iter.getUTCMonth() + 1);
        }
        monthsToCheck.forEach(key => {
            const [y,m] = key.split('-').map(n=>parseInt(n));
            const daysInMonth = getDaysInMonth(y,m);
            const d = new Date(Date.UTC(y,m,Math.min(payDay,daysInMonth)));
            if (d >= pStart && d <= pEnd && d >= start && (!end || d <= end)) dates.push(d);
        });
    } else if (freq === 'Semanal') {
        if (start > pEnd || (end && end < pStart)) return [];
        const payDow = start.getUTCDay();
        let d = new Date(pStart.getTime());
        while (d <= pEnd) {
            if (d.getUTCDay() === payDow && d >= start && (!end || d <= end)) dates.push(new Date(d));
            d.setUTCDate(d.getUTCDate() + 1);
        }
    } else if (freq === 'Bi-semanal') {
        if (start > pEnd || (end && end < pStart)) return [];
        let payDate = new Date(start.getTime());
        while (payDate < pStart) {
            payDate = addWeeks(payDate, 2);
            if (end && payDate > end) return dates;
        }
        while (payDate <= pEnd) {
            if (!end || payDate <= end) dates.push(new Date(payDate));
            payDate = addWeeks(payDate, 2);
        }
    }
    return dates;
}


function getPeriodStartDate(date, periodicity) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    let periodStart;

    if (periodicity === "Mensual") {
        periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    } else if (periodicity === "Semanal") {
        const [isoYearForWeek, weekNumber] = getWeekNumber(date);
        const monday = getMondayOfWeek(isoYearForWeek, weekNumber); 
        periodStart = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0));
    } else {
        throw new Error("Invalid periodicity provided to getPeriodStartDate. Must be 'Mensual' or 'Semanal'.");
    }
    return periodStart;
}

function getPeriodEndDate(date, periodicity) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    let periodEnd;

    if (periodicity === "Mensual") {
        periodEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)); 
        periodEnd.setUTCDate(periodEnd.getUTCDate() - 1); 
    } else if (periodicity === "Semanal") {
        const [isoYearForWeek, weekNumber] = getWeekNumber(date);
        const monday = getMondayOfWeek(isoYearForWeek, weekNumber); 
        periodEnd = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 0, 0, 0, 0));
    } else {
        throw new Error("Invalid periodicity provided to getPeriodEndDate. Must be 'Mensual' or 'Semanal'.");
    }
    return periodEnd;
}

// calculateCashFlowData (Updated to reflect app.js state after Turn 11 fixes)
function calculateCashFlowData(data) {
    const startDate = data.analysis_start_date; 
    const duration = parseInt(data.analysis_duration, 10); 
    const periodicity = data.analysis_periodicity;
    const initialBalance = parseFloat(data.analysis_initial_balance);
    const useInstant = !!data.use_instant_expenses;
    
    let periodDates = []; 
    let income_p = Array(duration).fill(0.0); 
    let fixed_exp_p = Array(duration).fill(0.0); 
    let var_exp_p = Array(duration).fill(0.0); 
    let net_flow_p = Array(duration).fill(0.0); 
    let end_bal_p = Array(duration).fill(0.0); 
    let expenses_by_cat_p = Array(duration).fill(null).map(() => ({}));
    
    let currentDate = new Date(startDate.getTime()); 
    let currentBalance = initialBalance;
    
    const fixedCategories = data.expense_categories ? Object.keys(data.expense_categories).filter(cat => data.expense_categories[cat] === "Fijo").sort() : [];
    const variableCategories = data.expense_categories ? Object.keys(data.expense_categories).filter(cat => data.expense_categories[cat] === "Variable").sort() : [];
    const orderedCategories = [...fixedCategories, ...variableCategories];
    orderedCategories.forEach(cat => { for (let k = 0; k < duration; k++) { expenses_by_cat_p[k][cat] = 0.0; } });

    for (let i = 0; i < duration; i++) {
        const p_start = getPeriodStartDate(currentDate, periodicity);
        const p_end = getPeriodEndDate(currentDate, periodicity);
        periodDates.push(p_start);
        let p_inc_total = 0.0;

        (data.incomes || []).forEach(inc => {
            if (!inc.start_date) return;
            if (inc.is_reimbursement) return; 

            const inc_start = inc.start_date; 
            const inc_end = inc.end_date; 
            const net_amount = parseFloat(inc.net_monthly || 0); 
            const inc_freq = inc.frequency || "Mensual";
            const isActiveRange = (inc_start <= p_end && (inc_end == null || inc_end >= p_start));
            if (!isActiveRange) return;
            
            let income_to_add = 0.0;

            if (inc_freq === "Único") {
                if (inc_start >= p_start && inc_start <= p_end) {
                    income_to_add = net_amount;
                }
            } else if (inc_freq === "Mensual") {
                const itemPaymentDay = inc_start.getUTCDate();
                let paymentOccurred = false;
                const p_start_year = p_start.getUTCFullYear();
                const p_start_month = p_start.getUTCMonth();
                const daysInPStartMonth = getDaysInMonth(p_start_year, p_start_month);
                const actualPaymentDayInPStartMonth = Math.min(itemPaymentDay, daysInPStartMonth);
                const paymentDateInPStartMonth = new Date(Date.UTC(p_start_year, p_start_month, actualPaymentDayInPStartMonth));
                if (paymentDateInPStartMonth >= p_start && paymentDateInPStartMonth <= p_end) {
                    if (inc_start <= paymentDateInPStartMonth && (inc_end == null || inc_end >= paymentDateInPStartMonth)) {
                        income_to_add = net_amount;
                        paymentOccurred = true;
                    }
                }
                if (!paymentOccurred) {
                    const p_end_year = p_end.getUTCFullYear();
                    const p_end_month = p_end.getUTCMonth();
                    if (p_start_month !== p_end_month) {
                        const daysInPEndMonth = getDaysInMonth(p_end_year, p_end_month);
                        const actualPaymentDayInPEndMonth = Math.min(itemPaymentDay, daysInPEndMonth);
                        const paymentDateInPEndMonth = new Date(Date.UTC(p_end_year, p_end_month, actualPaymentDayInPEndMonth));
                        if (paymentDateInPEndMonth >= p_start && paymentDateInPEndMonth <= p_end) {
                            if (inc_start <= paymentDateInPEndMonth && (inc_end == null || inc_end >= paymentDateInPEndMonth)) {
                                income_to_add = net_amount;
                            }
                        }
                    }
                }
            } else if (inc_freq === "Semanal") {
                if (periodicity === "Semanal") {
                    income_to_add = net_amount;
                } else { 
                    let occurrences = 0;
                    let dayIterator = new Date(p_start.getTime());
                    const incomePaymentUTCDay = inc_start.getUTCDay(); 
                    while (dayIterator <= p_end) {
                        if (dayIterator.getUTCDay() === incomePaymentUTCDay) {
                            if (inc_start <= dayIterator && (inc_end == null || inc_end >= dayIterator)) {
                                occurrences++;
                            }
                        }
                        dayIterator.setUTCDate(dayIterator.getUTCDate() + 1);
                    }
                    income_to_add = net_amount * occurrences;
                }
            } else if (inc_freq === "Bi-semanal") {
                let current_payment_date = new Date(inc_start.getTime());
                while (current_payment_date < p_start) {
                    current_payment_date = addWeeks(current_payment_date, 2);
                    if (inc_end && current_payment_date > inc_end) break;
                }
                while (current_payment_date <= p_end) {
                    if (inc_end && current_payment_date > inc_end) break; 
                    if (current_payment_date >= inc_start) { 
                       income_to_add += net_amount;
                    }
                    current_payment_date = addWeeks(current_payment_date, 2);
                }
            }
            p_inc_total += income_to_add;
        });
        income_p[i] = p_inc_total;

        let p_fix_exp_total_for_period = 0.0;
        let p_var_exp_total_for_period = 0.0;

        (data.expenses || []).forEach(exp => {
            if (!exp.start_date) return;
            const baseStart = useInstant && exp.movement_date ? exp.movement_date : exp.start_date;
            const e_start = baseStart;
            let e_end = exp.end_date;
            if (useInstant && exp.end_date && exp.movement_date) {
                const diff = new Date(exp.start_date).getTime() - new Date(exp.movement_date).getTime();
                e_end = new Date(new Date(exp.end_date).getTime() - diff);
            }
            let amt_raw = parseFloat(exp.amount || 0);
            const inst = parseInt(exp.installments || 1);
            let freq = exp.frequency || "Mensual";
            if (inst > 1 && !useInstant) {
                freq = "Mensual";
                amt_raw = amt_raw / inst;
                e_end = addMonths(new Date(e_start), inst - 1);
            }
            const cat = exp.category;
            if (amt_raw < 0 || !cat || !orderedCategories.includes(cat)) return;
            const isActiveRange = (e_start <= p_end && (e_end == null || e_end >= p_start));
            if (!isActiveRange) return;
            
            let exp_add_this_period = 0.0;

            if (freq === "Único") {
                if (e_start >= p_start && e_start <= p_end) {
                    exp_add_this_period = amt_raw;
                }
            } else if (freq === "Mensual") {
                const itemPaymentDay = e_start.getUTCDate();
                let paymentOccurred = false;
                const p_start_year = p_start.getUTCFullYear();
                const p_start_month = p_start.getUTCMonth();
                const daysInPStartMonth = getDaysInMonth(p_start_year, p_start_month);
                const actualPaymentDayInPStartMonth = Math.min(itemPaymentDay, daysInPStartMonth);
                const paymentDateInPStartMonth = new Date(Date.UTC(p_start_year, p_start_month, actualPaymentDayInPStartMonth));
                if (paymentDateInPStartMonth >= p_start && paymentDateInPStartMonth <= p_end) {
                    if (e_start <= paymentDateInPStartMonth && (e_end == null || e_end >= paymentDateInPStartMonth)) {
                        exp_add_this_period = amt_raw;
                        paymentOccurred = true;
                    }
                }
                if (!paymentOccurred) {
                    const p_end_year = p_end.getUTCFullYear();
                    const p_end_month = p_end.getUTCMonth();
                    if (p_start_month !== p_end_month) {
                        const daysInPEndMonth = getDaysInMonth(p_end_year, p_end_month);
                        const actualPaymentDayInPEndMonth = Math.min(itemPaymentDay, daysInPEndMonth);
                        const paymentDateInPEndMonth = new Date(Date.UTC(p_end_year, p_end_month, actualPaymentDayInPEndMonth));
                        if (paymentDateInPEndMonth >= p_start && paymentDateInPEndMonth <= p_end) {
                            if (e_start <= paymentDateInPEndMonth && (e_end == null || e_end >= paymentDateInPEndMonth)) {
                                exp_add_this_period = amt_raw;
                            }
                        }
                    }
                }
            } else if (freq === "Semanal") {
                if (periodicity === "Semanal") {
                    exp_add_this_period = amt_raw;
                } else { 
                    let occurrences = 0;
                    let dayIterator = new Date(p_start.getTime());
                    const expensePaymentUTCDay = e_start.getUTCDay();
                    while (dayIterator <= p_end) {
                        if (dayIterator.getUTCDay() === expensePaymentUTCDay) {
                            if (e_start <= dayIterator && (e_end == null || e_end >= dayIterator)) {
                                occurrences++;
                            }
                        }
                        dayIterator.setUTCDate(dayIterator.getUTCDate() + 1);
                    }
                    exp_add_this_period = amt_raw * occurrences;
                }
            } else if (freq === "Bi-semanal") {
                let current_payment_date = new Date(e_start.getTime());
                while (current_payment_date < p_start) {
                    current_payment_date = addWeeks(current_payment_date, 2);
                    if (e_end && current_payment_date > e_end) break;
                }
                while (current_payment_date <= p_end) {
                    if (e_end && current_payment_date > e_end) break; 
                    if (current_payment_date >= e_start) { 
                        exp_add_this_period += amt_raw;
                    }
                    current_payment_date = addWeeks(current_payment_date, 2);
                }
            }

            if (exp_add_this_period > 0) {
                expenses_by_cat_p[i][cat] = (expenses_by_cat_p[i][cat] || 0) + exp_add_this_period;
            }
        });

        (data.incomes || []).forEach(reimbInc => {
            if (!reimbInc.is_reimbursement || !reimbInc.reimbursement_category || !reimbInc.start_date) return;

            const reimb_start = reimbInc.start_date;
            const reimb_end = reimbInc.end_date;
            const reimb_amount_raw = parseFloat(reimbInc.net_monthly || 0);
            const reimb_freq = reimbInc.frequency || "Mensual";
            const reimb_cat = reimbInc.reimbursement_category;

            const isActiveRange = (reimb_start <= p_end && (reimb_end == null || reimb_end >= p_start));
            if (!isActiveRange) return;

            let amount_of_reimbursement_in_this_period = 0.0;

            if (reimb_freq === "Único") {
                if (reimb_start >= p_start && reimb_start <= p_end) {
                    amount_of_reimbursement_in_this_period = reimb_amount_raw;
                }
            } else if (reimb_freq === "Mensual") {
                const itemPaymentDay = reimb_start.getUTCDate();
                let paymentOccurred = false;
                const p_start_year = p_start.getUTCFullYear();
                const p_start_month = p_start.getUTCMonth();
                const daysInPStartMonth = getDaysInMonth(p_start_year, p_start_month);
                const actualPaymentDayInPStartMonth = Math.min(itemPaymentDay, daysInPStartMonth);
                const paymentDateInPStartMonth = new Date(Date.UTC(p_start_year, p_start_month, actualPaymentDayInPStartMonth));
                if (paymentDateInPStartMonth >= p_start && paymentDateInPStartMonth <= p_end) {
                    if (reimb_start <= paymentDateInPStartMonth && (reimb_end == null || reimb_end >= paymentDateInPStartMonth)) {
                        amount_of_reimbursement_in_this_period = reimb_amount_raw;
                        paymentOccurred = true;
                    }
                }
                if (!paymentOccurred) {
                    const p_end_year = p_end.getUTCFullYear();
                    const p_end_month = p_end.getUTCMonth();
                    if (p_start_month !== p_end_month) { 
                        const daysInPEndMonth = getDaysInMonth(p_end_year, p_end_month);
                        const actualPaymentDayInPEndMonth = Math.min(itemPaymentDay, daysInPEndMonth);
                        const paymentDateInPEndMonth = new Date(Date.UTC(p_end_year, p_end_month, actualPaymentDayInPEndMonth));
                        if (paymentDateInPEndMonth >= p_start && paymentDateInPEndMonth <= p_end) {
                            if (reimb_start <= paymentDateInPEndMonth && (reimb_end == null || reimb_end >= paymentDateInPEndMonth)) {
                                amount_of_reimbursement_in_this_period = reimb_amount_raw;
                            }
                        }
                    }
                }
            } else if (reimb_freq === "Semanal") {
                if (periodicity === "Semanal") {
                    amount_of_reimbursement_in_this_period = reimb_amount_raw;
                } else { 
                    let occurrences = 0;
                    let dayIterator = new Date(p_start.getTime());
                    const reimbursementPaymentUTCDay = reimb_start.getUTCDay();
                    while (dayIterator <= p_end) {
                        if (dayIterator.getUTCDay() === reimbursementPaymentUTCDay) {
                            if (reimb_start <= dayIterator && (reimb_end == null || reimb_end >= dayIterator)) {
                                occurrences++;
                            }
                        }
                        dayIterator.setUTCDate(dayIterator.getUTCDate() + 1);
                    }
                    amount_of_reimbursement_in_this_period = reimb_amount_raw * occurrences;
                }
            } else if (reimb_freq === "Bi-semanal") {
                let current_payment_date = new Date(reimb_start.getTime());
                 while (current_payment_date < p_start) {
                    current_payment_date = addWeeks(current_payment_date, 2);
                    if (reimb_end && current_payment_date > reimb_end) break;
                }
                while (current_payment_date <= p_end) {
                    if (reimb_end && current_payment_date > reimb_end) break;
                    if (current_payment_date >= reimb_start) { 
                       amount_of_reimbursement_in_this_period += reimb_amount_raw;
                    }
                    current_payment_date = addWeeks(current_payment_date, 2);
                }
            }

            if (amount_of_reimbursement_in_this_period > 0 && expenses_by_cat_p[i][reimb_cat] !== undefined) {
                expenses_by_cat_p[i][reimb_cat] = (expenses_by_cat_p[i][reimb_cat] || 0) - amount_of_reimbursement_in_this_period;
            }
        });
        
        p_fix_exp_total_for_period = 0;
        p_var_exp_total_for_period = 0;
        for (const cat_name_final in expenses_by_cat_p[i]) {
            const cat_expense_final = expenses_by_cat_p[i][cat_name_final];
            const expenseTypeFinal = (data.expense_categories && data.expense_categories[cat_name_final]) ? data.expense_categories[cat_name_final] : "Variable";
            if (expenseTypeFinal === "Fijo") {
                p_fix_exp_total_for_period += cat_expense_final;
            } else {
                p_var_exp_total_for_period += cat_expense_final;
            }
        }
        fixed_exp_p[i] = p_fix_exp_total_for_period;
        var_exp_p[i] = p_var_exp_total_for_period;

        const net_flow = p_inc_total - (fixed_exp_p[i] + var_exp_p[i]); 
        net_flow_p[i] = net_flow;
        const end_bal = currentBalance + net_flow; 
        end_bal_p[i] = end_bal;
        currentBalance = end_bal; 
        currentDate = (periodicity === "Mensual") ? addMonths(currentDate, 1) : addWeeks(currentDate, 1);
    }
    return { periodDates, income_p, fixed_exp_p, var_exp_p, net_flow_p, end_bal_p, expenses_by_cat_p };
}


// --- Test Definitions ---

runTest("getPeriodStartDate - Mensual - Mid-month", () => {
    const date = new Date(Date.UTC(2024, 0, 15)); // Jan 15, 2024
    const expected = new Date(Date.UTC(2024, 0, 1));
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Mensual").toISOString(), "Jan 15 -> Jan 1");
});

runTest("getPeriodStartDate - Mensual - First day", () => {
    const date = new Date(Date.UTC(2024, 1, 1)); // Feb 1, 2024
    const expected = new Date(Date.UTC(2024, 1, 1));
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Mensual").toISOString(), "Feb 1 -> Feb 1");
});

runTest("getPeriodStartDate - Mensual - Last day", () => {
    const date = new Date(Date.UTC(2024, 2, 31)); // Mar 31, 2024
    const expected = new Date(Date.UTC(2024, 2, 1));
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Mensual").toISOString(), "Mar 31 -> Mar 1");
});

runTest("getPeriodStartDate - Semanal - Mid-week (Wed, Jan 10, 2024, Week 2)", () => {
    const date = new Date(Date.UTC(2024, 0, 10)); 
    const expected = new Date(Date.UTC(2024, 0, 8)); // Mon, Jan 8, 2024
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Semanal").toISOString(), "Jan 10 (Wed) -> Jan 8 (Mon)");
});

runTest("getPeriodStartDate - Semanal - Monday (Jan 8, 2024)", () => {
    const date = new Date(Date.UTC(2024, 0, 8));
    const expected = new Date(Date.UTC(2024, 0, 8));
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Semanal").toISOString(), "Jan 8 (Mon) -> Jan 8 (Mon)");
});

runTest("getPeriodStartDate - Semanal - Sunday (Jan 14, 2024, Week 2)", () => {
    const date = new Date(Date.UTC(2024, 0, 14)); 
    const expected = new Date(Date.UTC(2024, 0, 8)); // Mon, Jan 8, 2024
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Semanal").toISOString(), "Jan 14 (Sun) -> Jan 8 (Mon)");
});

runTest("getPeriodStartDate - Semanal - Year Boundary (Jan 1, 2024 - Mon, Week 1)", () => {
    const date = new Date(Date.UTC(2024, 0, 1));
    const expected = new Date(Date.UTC(2024, 0, 1));
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Semanal").toISOString(), "Jan 1, 2024 (Mon) -> Jan 1, 2024 (Mon)");
});

runTest("getPeriodStartDate - Semanal - Year Boundary (Dec 31, 2023 - Sun, Week 52 2023)", () => {
    const date = new Date(Date.UTC(2023, 11, 31)); // Dec 31, 2023
    const expected = new Date(Date.UTC(2023, 11, 25)); // Mon, Dec 25, 2023
    assertEquals(expected.toISOString(), getPeriodStartDate(date, "Semanal").toISOString(), "Dec 31, 2023 (Sun) -> Dec 25, 2023 (Mon)");
});


runTest("getPeriodEndDate - Mensual - Mid-month", () => {
    const date = new Date(Date.UTC(2024, 0, 15)); // Jan 15, 2024
    const expected = new Date(Date.UTC(2024, 0, 31));
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Mensual").toISOString(), "Jan 15 -> Jan 31");
});

runTest("getPeriodEndDate - Mensual - Feb (non-leap)", () => {
    const date = new Date(Date.UTC(2024, 1, 15)); // Feb 15, 2024
    const expected = new Date(Date.UTC(2024, 1, 29)); // Corrected to 29 for 2024 leap year
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Mensual").toISOString(), "Feb 15, 2024 -> Feb 29, 2024");
});
runTest("getPeriodEndDate - Mensual - Feb (non-leap year 2023)", () => {
    const date = new Date(Date.UTC(2023, 1, 15)); // Feb 15, 2023
    const expected = new Date(Date.UTC(2023, 1, 28)); 
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Mensual").toISOString(), "Feb 15, 2023 -> Feb 28, 2023");
});


runTest("getPeriodEndDate - Mensual - Feb (leap)", () => {
    const date = new Date(Date.UTC(2020, 1, 15)); // Feb 15, 2020
    const expected = new Date(Date.UTC(2020, 1, 29));
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Mensual").toISOString(), "Feb 15, 2020 -> Feb 29, 2020");
});

runTest("getPeriodEndDate - Semanal - Mid-week (Wed, Jan 10, 2024)", () => {
    const date = new Date(Date.UTC(2024, 0, 10));
    const expected = new Date(Date.UTC(2024, 0, 14)); // Sun, Jan 14, 2024
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Semanal").toISOString(), "Jan 10 (Wed) -> Jan 14 (Sun)");
});

runTest("getPeriodEndDate - Semanal - Monday (Jan 8, 2024)", () => {
    const date = new Date(Date.UTC(2024, 0, 8));
    const expected = new Date(Date.UTC(2024, 0, 14)); // Sun, Jan 14, 2024
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Semanal").toISOString(), "Jan 8 (Mon) -> Jan 14 (Sun)");
});

runTest("getPeriodEndDate - Semanal - Sunday (Jan 14, 2024)", () => {
    const date = new Date(Date.UTC(2024, 0, 14));
    const expected = new Date(Date.UTC(2024, 0, 14));
    assertEquals(expected.toISOString(), getPeriodEndDate(date, "Semanal").toISOString(), "Jan 14 (Sun) -> Jan 14 (Sun)");
});

runTest("getPeriodStartDate - Invalid periodicity throws", () => {
    let threw = false;
    try {
        getPeriodStartDate(new Date(), "Diario");
    } catch (e) {
        threw = true;
    }
    assertTrue(threw, "getPeriodStartDate should throw on invalid periodicity");
});

runTest("getPeriodEndDate - Invalid periodicity throws", () => {
    let threw = false;
    try {
        getPeriodEndDate(new Date(), "Diario");
    } catch (e) {
        threw = true;
    }
    assertTrue(threw, "getPeriodEndDate should throw on invalid periodicity");
});

// --- calculateCashFlowData Tests ---
const mockExpenseCategories = { "Food": "Variable", "Salary": "Fijo", "Rent": "Fijo", "Transport": "Variable", "Utilities": "Fijo", "TestBugCat": "Variable", "TestMonthlyBugCat": "Variable" };

runTest("calculateCashFlowData - Scenario 1: Monthly Analysis, Monthly Item", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "Inc1", net_monthly: 100, frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 5)), end_date: null, is_reimbursement: false }
        ],
        expenses: [
            { name: "Exp1", amount: 50, category: "Rent", frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 15)), end_date: null }
        ]
    };
    const result = calculateCashFlowData(data);
    assertEquals(100, result.income_p[0], "Scenario 1 - Income");
    assertEquals(50, result.fixed_exp_p[0], "Scenario 1 - Fixed Expense (Rent)");
    assertEquals(0, result.var_exp_p[0], "Scenario 1 - Variable Expense");
});

runTest("calculateCashFlowData - Scenario 2: Monthly Analysis, Weekly Item", () => {
    // Jan 2024: Jan 1 is Mon. Mondays: 1, 8, 15, 22, 29 (5 Mondays)
    // Fridays: 5, 12, 19, 26 (4 Fridays)
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncWeekly", net_monthly: 10, frequency: "Semanal", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null, is_reimbursement: false } // Starts Mon, Jan 1
        ],
        expenses: [
            { name: "ExpWeekly", amount: 5, category: "Transport", frequency: "Semanal", start_date: new Date(Date.UTC(2024, 0, 5)), end_date: null } // Starts Fri, Jan 5
        ]
    };
    const result = calculateCashFlowData(data);
    assertEquals(10 * 5, result.income_p[0], "Scenario 2 - Income (5 Mondays in Jan 2024)");
    assertEquals(5 * 4, result.var_exp_p[0], "Scenario 2 - Variable Expense (4 Fridays in Jan 2024 for Transport)");
});


runTest("calculateCashFlowData - Scenario 3: Monthly Analysis, Bi-weekly Item", () => {
    // Jan 2024. Payments on Jan 1, Jan 15, Jan 29
    // Payments on Jan 8, Jan 22
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncBiWeekly", net_monthly: 20, frequency: "Bi-semanal", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null, is_reimbursement: false }
        ],
        expenses: [
            { name: "ExpBiWeekly", amount: 7, category: "Food", frequency: "Bi-semanal", start_date: new Date(Date.UTC(2024, 0, 8)), end_date: null }
        ]
    };
    const result = calculateCashFlowData(data);
    assertEquals(20 * 3, result.income_p[0], "Scenario 3 - Income (Jan 1, 15, 29)");
    assertEquals(7 * 2, result.var_exp_p[0], "Scenario 3 - Variable Expense (Jan 8, 22 for Food)");
});

runTest("calculateCashFlowData - Instant Expense Uses Movement Date", () => {
    const dataBase = {
        analysis_start_date: new Date(Date.UTC(2024, 3, 1)), // April 1, 2024
        analysis_duration: 2,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: { "TestCat": "Variable" },
        incomes: [],
        expenses: [
            { name: "CardExp", amount: 100, category: "TestCat", frequency: "Mensual", start_date: new Date(Date.UTC(2024,4,10)), movement_date: new Date(Date.UTC(2024,3,15)), end_date: null }
        ]
    };
    let res = calculateCashFlowData({ ...dataBase, use_instant_expenses: false });
    assertEquals(0, res.var_exp_p[0], "Instant Off - April should be 0");
    assertEquals(100, res.var_exp_p[1], "Instant Off - May should be 100");
    res = calculateCashFlowData({ ...dataBase, use_instant_expenses: true });
    assertEquals(100, res.var_exp_p[0], "Instant On - April should be 100");
});

runTest("calculateCashFlowData - Credit Card Installments", () => {
    const baseData = {
        analysis_start_date: new Date(Date.UTC(2024,0,1)),
        analysis_duration: 4,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: { "TestCat": "Variable" },
        incomes: [],
        expenses: [
            { name: "InstPurchase", amount: 90, category: "TestCat", frequency: "Único", start_date: new Date(Date.UTC(2024,1,5)), movement_date: new Date(Date.UTC(2024,0,15)), end_date: null, installments: 3 }
        ]
    };
    let r = calculateCashFlowData({ ...baseData, use_instant_expenses: false });
    assertEquals(0, r.var_exp_p[0], "Installments - Jan should be 0");
    assertEquals(30, r.var_exp_p[1], "Installments - Feb should be 30");
    assertEquals(30, r.var_exp_p[2], "Installments - Mar should be 30");
    assertEquals(30, r.var_exp_p[3], "Installments - Apr should be 30");
    r = calculateCashFlowData({ ...baseData, use_instant_expenses: true });
    assertEquals(90, r.var_exp_p[0], "Instant mode - Jan charged full amount");
});

runTest("calculateCashFlowData - Scenario 4: Weekly Analysis, Monthly Item", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)), // Week: Jan 1 - Jan 7
        analysis_duration: 2, // Check 2 weeks
        analysis_periodicity: "Semanal",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncMonthly1", net_monthly: 100, frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 5)), end_date: null, is_reimbursement: false }, // Pays on 5th
            { name: "IncMonthly2", net_monthly: 200, frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 10)), end_date: null, is_reimbursement: false } // Pays on 10th
        ],
        expenses: []
    };
    const result = calculateCashFlowData(data);
    assertEquals(100, result.income_p[0], "Scenario 4 - Income (Week 1: Jan 1-7, Inc1 pays)");
    assertEquals(200, result.income_p[1], "Scenario 4 - Income (Week 2: Jan 8-14, Inc2 pays)");
});

runTest("calculateCashFlowData - Scenario 5: Weekly Analysis, Weekly Item", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Semanal",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncWeekly", net_monthly: 10, frequency: "Semanal", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null, is_reimbursement: false }
        ],
        expenses: []
    };
    const result = calculateCashFlowData(data);
    assertEquals(10, result.income_p[0], "Scenario 5 - Income");
});

runTest("calculateCashFlowData - Scenario 6: Weekly Analysis, Bi-weekly Item", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)), // Week 1: Jan 1 - Jan 7
        analysis_duration: 2,                            // Week 2: Jan 8 - Jan 14
        analysis_periodicity: "Semanal",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncBiWeekly", net_monthly: 20, frequency: "Bi-semanal", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null, is_reimbursement: false } // Pays Jan 1, Jan 15
        ],
        expenses: [
            { name: "ExpBiWeekly", amount: 7, category: "Food", frequency: "Bi-semanal", start_date: new Date(Date.UTC(2024, 0, 8)), end_date: null } // Pays Jan 8, Jan 22
        ]
    };
    const result = calculateCashFlowData(data);
    assertEquals(20, result.income_p[0], "Scenario 6 - Income (Week 1: Jan 1-7, Inc pays on Jan 1)");
    assertEquals(0, result.var_exp_p[0], "Scenario 6 - Expense (Week 1: Jan 1-7, Exp starts Jan 8)");
    
    assertEquals(0, result.income_p[1], "Scenario 6 - Income (Week 2: Jan 8-14, Inc pays Jan 15 - not in this week)");
    assertEquals(7, result.var_exp_p[1], "Scenario 6 - Expense (Week 2: Jan 8-14, Exp pays on Jan 8)");
});

runTest("calculateCashFlowData - Scenario 7: Item starting/ending mid-period (Monthly)", () => {
    // Jan 2024. Income: Weekly $10. Starts Jan 10 (Wed), Ends Jan 24 (Wed).
    // Payments: Jan 10, Jan 17, Jan 24. (3 occurrences)
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncMid", net_monthly: 10, frequency: "Semanal", start_date: new Date(Date.UTC(2024, 0, 10)), end_date: new Date(Date.UTC(2024, 0, 24)), is_reimbursement: false }
        ],
        expenses: []
    };
    const result = calculateCashFlowData(data);
    assertEquals(10 * 3, result.income_p[0], "Scenario 7 - Income (Jan 10, 17, 24)");
});


runTest("calculateCashFlowData - Scenario 8: Reimbursement", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "Reimb1", net_monthly: 20, frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null, is_reimbursement: true, reimbursement_category: "Food" }
        ],
        expenses: [
            { name: "ExpFood", amount: 50, category: "Food", frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null }
        ]
    };
    const result = calculateCashFlowData(data);
    assertEquals(0, result.income_p[0], "Scenario 8 - Income (Reimbursements don't add to p_inc_total)");
    assertEquals(50 - 20, result.expenses_by_cat_p[0]["Food"], "Scenario 8 - Expense for Food (50 - 20)");
    assertEquals(30, result.var_exp_p[0], "Scenario 8 - Total Variable Expense");
});

runTest("calculateCashFlowData - Scenario 9: Year Boundary (Weekly View)", () => {
    // Week 1: Dec 25, 2023 - Dec 31, 2023
    // Week 2: Jan 1, 2024 - Jan 7, 2024
    const data = {
        analysis_start_date: new Date(Date.UTC(2023, 11, 25)), 
        analysis_duration: 2, 
        analysis_periodicity: "Semanal",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "IncMonthlyNewYear", net_monthly: 100, frequency: "Mensual", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null, is_reimbursement: false } // Pays on 1st of month
        ],
        expenses: []
    };
    const result = calculateCashFlowData(data);
    assertEquals(0, result.income_p[0], "Scenario 9 - Income (Week Dec 25-31, 2023)");
    assertEquals(100, result.income_p[1], "Scenario 9 - Income (Week Jan 1-7, 2024)");
});

runTest("calculateCashFlowData - Scenario 10: Reimbursement Exceeds Expense (Weekly)", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024, 0, 1)),
        analysis_duration: 1,
        analysis_periodicity: "Semanal",
        analysis_initial_balance: 0,
        expense_categories: mockExpenseCategories,
        incomes: [
            { name: "ReimbBig", net_monthly: 70, frequency: "Único", start_date: new Date(Date.UTC(2024, 0, 2)), end_date: null, is_reimbursement: true, reimbursement_category: "Food" }
        ],
        expenses: [
            { name: "ExpFoodOnce", amount: 50, category: "Food", frequency: "Único", start_date: new Date(Date.UTC(2024, 0, 1)), end_date: null }
        ]
    };
    const result = calculateCashFlowData(data);
    assertEquals(-20, result.expenses_by_cat_p[0]["Food"], "Scenario 10 - Expense for Food becomes negative (50 - 70)");
    assertEquals(-20, result.var_exp_p[0], "Scenario 10 - Total Variable Expense negative");
    assertEquals(20, result.net_flow_p[0], "Scenario 10 - Net flow reflects credit");
});

runTest("testWeeklyView_Oct1Expense_AnalysisFromSep24", () => {
    const mockData = {
        analysis_start_date: new Date(Date.UTC(2025, 8, 24)), // September 24, 2025 (Wednesday)
        analysis_periodicity: "Semanal",
        analysis_duration: 15, 
        analysis_initial_balance: 0,
        display_currency_symbol: "$",
        expense_categories: { "TestBugCat": "Variable" },
        expenses: [
            { name: "Oct1Expense", amount: 100, category: "TestBugCat", frequency: "Único", start_date: new Date(Date.UTC(2025, 9, 1)), end_date: null, is_real: false } // October 1, 2025
        ],
        incomes: [],
        payments: {},
        budgets: {},
        // Ensure all necessary fields for calculateCashFlowData are present
        baby_steps_status: [], 
        reminders_todos: [],
        change_log: []
    };

    const { periodDates, expenses_by_cat_p, var_exp_p } = calculateCashFlowData(mockData);

    // Assertions for period dates
    // Week containing Sep 24, 2025 (Wed): Monday is Sep 22, 2025
    assertEquals(new Date(Date.UTC(2025, 8, 22)).getTime(), periodDates[0].getTime(), "TestBug: Period 0 (Week of Sep 22) p_start");
    
    // Week containing Oct 1, 2025 (Wed): Monday is Sep 29, 2025
    assertEquals(new Date(Date.UTC(2025, 8, 29)).getTime(), periodDates[1].getTime(), "TestBug: Period 1 (Week of Sep 29) p_start");

    // Week after Oct 1: Monday is Oct 6, 2025
    assertEquals(new Date(Date.UTC(2025, 9, 6)).getTime(), periodDates[2].getTime(), "TestBug: Period 2 (Week of Oct 6) p_start");

    // Check that the first few periods are not December (sanity check related to bug description)
    assertTrue(periodDates[0].getUTCMonth() !== 11, "TestBug: Period 0 should not be December"); // Sep
    assertTrue(periodDates[1].getUTCMonth() !== 11, "TestBug: Period 1 should not be December"); // Sep
    assertTrue(periodDates[2].getUTCMonth() !== 11, "TestBug: Period 2 should not be December"); // Oct


    // Assertions for expense assignment
    // Period 0: Week of Sep 22 - Sep 28. Oct 1 expense should not be here.
    assertEquals(0, (expenses_by_cat_p[0]["TestBugCat"] || 0), "TestBug: Oct1Expense should be 0 in week of Sep 22");
    assertEquals(0, (var_exp_p[0] || 0), "TestBug: Total var_exp_p[0] should be 0 in week of Sep 22");


    // Period 1: Week of Sep 29 - Oct 5. Oct 1 expense should be here.
    assertEquals(100, (expenses_by_cat_p[1]["TestBugCat"] || 0), "TestBug: Oct1Expense should be 100 in week of Sep 29");
    assertEquals(100, (var_exp_p[1] || 0), "TestBug: Total var_exp_p[1] should be 100 in week of Sep 29");


    // Period 2: Week of Oct 6 - Oct 12. Oct 1 expense should not be here.
    assertEquals(0, (expenses_by_cat_p[2]["TestBugCat"] || 0), "TestBug: Oct1Expense should be 0 in week of Oct 6");
    assertEquals(0, (var_exp_p[2] || 0), "TestBug: Total var_exp_p[2] should be 0 in week of Oct 6");

});

runTest("testWeeklyView_MonthlyRecurringExpense_Oct1_AnalysisFromSep24", () => {
    const mockData = {
        analysis_start_date: new Date(Date.UTC(2025, 8, 24)), // September 24, 2025 (Wednesday)
        analysis_periodicity: "Semanal",
        analysis_duration: 15, 
        analysis_initial_balance: 0,
        display_currency_symbol: "$",
        expense_categories: { "TestMonthlyBugCat": "Variable" }, // Corrected category name
        expenses: [
            { 
                name: "Oct1MonthlyRecurringExp", 
                amount: 100, 
                category: "TestMonthlyBugCat", 
                frequency: "Mensual", 
                start_date: new Date(Date.UTC(2025, 9, 1)), // October 1, 2025
                end_date: null, 
                is_real: false 
            }
        ],
        incomes: [],
        payments: {},
        budgets: {},
        baby_steps_status: [], 
        reminders_todos: [],
        change_log: []
    };

    const { periodDates, expenses_by_cat_p, var_exp_p } = calculateCashFlowData(mockData);

    // 1. Verify Period Dates
    // Period 0: Week containing Sep 24 (Wed) -> Mon, Sep 22, 2025
    assertEquals(new Date(Date.UTC(2025, 8, 22)).getTime(), periodDates[0].getTime(), "TestMonthlyBug: Period 0 (Week of Sep 22) p_start");
    // Period 1: Week containing Oct 1 (Wed) -> Mon, Sep 29, 2025
    assertEquals(new Date(Date.UTC(2025, 8, 29)).getTime(), periodDates[1].getTime(), "TestMonthlyBug: Period 1 (Week of Sep 29) p_start");
    
    // Sanity check for early periods not being December
    assertTrue(periodDates[0].getUTCMonth() === 8, "TestMonthlyBug: Period 0 Month should be September"); 
    assertTrue(periodDates[1].getUTCMonth() === 8, "TestMonthlyBug: Period 1 Month should be September");


    // 2. Verify Expense Assignment
    // October 1, 2025 is a Wednesday.
    // Expense payment day is the 1st of the month.

    // Period 0 (Week of Sep 22-28): Expense should be 0
    assertEquals(0, (expenses_by_cat_p[0]["TestMonthlyBugCat"] || 0), "TestMonthlyBug: Expense should be 0 in week of Sep 22");
    assertEquals(0, (var_exp_p[0] || 0), "TestMonthlyBug: Total var_exp_p[0] for Sep 22 week");

    // Period 1 (Week of Sep 29 - Oct 5): Contains Oct 1st. Expense should be 100.
    assertEquals(100, (expenses_by_cat_p[1]["TestMonthlyBugCat"] || 0), "TestMonthlyBug: Expense should be 100 in week of Sep 29 (for Oct 1 payment)");
    assertEquals(100, (var_exp_p[1] || 0), "TestMonthlyBug: Total var_exp_p[1] for Sep 29 week");
    
    // Check other weeks in October - should be 0
    // Period 2: Oct 6 - Oct 12
    if (periodDates.length > 2) {
      assertEquals(0, (expenses_by_cat_p[2]["TestMonthlyBugCat"] || 0), "TestMonthlyBug: Expense should be 0 in week of Oct 6");
    }


    // November 1, 2025 is a Saturday. Week is Oct 27 - Nov 2.
    const weekOfNov1ExpectedStart = new Date(Date.UTC(2025, 9, 27)); // Monday Oct 27
    const idxNov = periodDates.findIndex(p => p.getTime() === weekOfNov1ExpectedStart.getTime());
    assertTrue(idxNov !== -1, `TestMonthlyBug: Find period index for week starting ${getISODateString(weekOfNov1ExpectedStart)}. Found indices: ${periodDates.map((pd,ix) => `${ix}:${getISODateString(pd)}`).join(', ')}`);
    if (idxNov !== -1) {
        assertEquals(100, (expenses_by_cat_p[idxNov]["TestMonthlyBugCat"] || 0), "TestMonthlyBug: Expense should be 100 in week of Nov 1 (Oct 27 - Nov 2)");
    }

    // December 1, 2025 is a Monday. Week is Dec 1 - Dec 7.
    const weekOfDec1ExpectedStart = new Date(Date.UTC(2025, 11, 1)); // Monday Dec 1
    const idxDec = periodDates.findIndex(p => p.getTime() === weekOfDec1ExpectedStart.getTime());
    assertTrue(idxDec !== -1, `TestMonthlyBug: Find period index for week starting ${getISODateString(weekOfDec1ExpectedStart)}`);
    if (idxDec !== -1) {
        assertEquals(100, (expenses_by_cat_p[idxDec]["TestMonthlyBugCat"] || 0), "TestMonthlyBug: Expense should be 100 in week of Dec 1");
    }
});
runTest("calculateCashFlowData - Credit Card Installments Weekly View", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024,0,1)),
        analysis_duration: 10,
        analysis_periodicity: "Semanal",
        analysis_initial_balance: 0,
        expense_categories: { "TestCat": "Variable" },
        incomes: [],
        expenses: [
            { name: "InstPurchase", amount: 100, category: "TestCat", frequency: "Único", start_date: new Date(Date.UTC(2024,1,5)), movement_date: new Date(Date.UTC(2024,0,15)), end_date: null, installments: 2 }
        ]
    };
    let r = calculateCashFlowData({ ...data, use_instant_expenses: false });
    assertEquals(50, r.var_exp_p[5], "Weekly View - first installment Feb 5");
    assertEquals(50, r.var_exp_p[9], "Weekly View - second installment Mar 5");
    r = calculateCashFlowData({ ...data, use_instant_expenses: true });
    assertEquals(100, r.var_exp_p[2], "Weekly View instant mode uses movement date");
});

runTest("calculateCashFlowData - Mixed Incomes and Installments", () => {
    const data = {
        analysis_start_date: new Date(Date.UTC(2024,0,1)),
        analysis_duration: 3,
        analysis_periodicity: "Mensual",
        analysis_initial_balance: 0,
        expense_categories: { "Rent": "Fijo", "Shopping": "Variable" },
        incomes: [
            { name: "Salary", net_monthly: 1000, frequency: "Mensual", start_date: new Date(Date.UTC(2024,0,1)), end_date: null, is_reimbursement: false }
        ],
        expenses: [
            { name: "Rent", amount: 500, category: "Rent", frequency: "Mensual", start_date: new Date(Date.UTC(2024,0,5)), end_date: null },
            { name: "TV", amount: 300, category: "Shopping", frequency: "Único", start_date: new Date(Date.UTC(2024,1,5)), movement_date: new Date(Date.UTC(2024,0,15)), end_date: null, installments: 3 }
        ]
    };
    let r = calculateCashFlowData({ ...data, use_instant_expenses: false });
    assertEquals(1000, r.income_p[0], "Mixed - Jan income");
    assertEquals(500, r.fixed_exp_p[0], "Mixed - Jan rent");
    assertEquals(0, r.var_exp_p[0], "Mixed - Jan var expense");
    assertEquals(1000, r.income_p[1], "Mixed - Feb income");
    assertEquals(500, r.fixed_exp_p[1], "Mixed - Feb rent");
    assertEquals(100, r.var_exp_p[1], "Mixed - Feb installment");
    assertEquals(1000, r.income_p[2], "Mixed - Mar income");
    assertEquals(500, r.fixed_exp_p[2], "Mixed - Mar rent");
    assertEquals(100, r.var_exp_p[2], "Mixed - Mar installment");
    r = calculateCashFlowData({ ...data, use_instant_expenses: true });
    assertEquals(300, r.var_exp_p[0], "Mixed - Instant mode charges full amount Jan");
});

runTest("getExpenseOccurrencesInPeriod - Monthly across week boundary", () => {
    const exp = { start_date: new Date(Date.UTC(2024,0,31)), frequency: "Mensual" };
    const pStart = new Date(Date.UTC(2024,1,26));
    const pEnd = new Date(Date.UTC(2024,2,3));
    const occ = getExpenseOccurrencesInPeriod(exp, pStart, pEnd, "Semanal", false);
    assertEquals(1, occ, "Monthly on 31 included in Feb 26-Mar 3 week");
});

runTest("getExpenseOccurrencesInPeriod - Weekly count in monthly view", () => {
    const exp = { start_date: new Date(Date.UTC(2024,0,1)), frequency: "Semanal" };
    const pStart = new Date(Date.UTC(2024,0,1));
    const pEnd = new Date(Date.UTC(2024,0,31));
    const occ = getExpenseOccurrencesInPeriod(exp, pStart, pEnd, "Mensual", false);
    assertEquals(5, occ, "5 Mondays in Jan 2024");
});

runTest("getExpenseOccurrencesInPeriod - Bi-weekly count in monthly view", () => {
    const exp = { start_date: new Date(Date.UTC(2024,0,1)), frequency: "Bi-semanal" };
    const pStart = new Date(Date.UTC(2024,0,1));
    const pEnd = new Date(Date.UTC(2024,0,31));
    const occ = getExpenseOccurrencesInPeriod(exp, pStart, pEnd, "Mensual", false);
    assertEquals(3, occ, "Bi-weekly Jan 2024 occurrences");
});

runTest("getExpenseOccurrencesInPeriod - Único weekly view", () => {
    const exp = { start_date: new Date(Date.UTC(2024,1,14)), frequency: "Único" };
    const pStart = new Date(Date.UTC(2024,1,12));
    const pEnd = new Date(Date.UTC(2024,1,18));
    const occ = getExpenseOccurrencesInPeriod(exp, pStart, pEnd, "Semanal", false);
    assertEquals(1, occ, "Unique expense in same week");
});

runTest("NET_INCOME breakdown excludes reimbursements", () => {
    const rows = [
        { type: 'Ingreso', name: 'Salary', amount: 100 },
        { type: 'Reembolso', name: 'Reimb', amount: 50 }
    ];
    const filtered = rows.filter(r => r.type === 'Ingreso');
    assertEquals(1, filtered.length, "Filtered only one income");
    assertEquals("Salary", filtered[0].name, "Filtered income is Salary");
});

runTest("getExpenseOccurrenceDatesInPeriod - Monthly", () => {
    const exp = { start_date: new Date(Date.UTC(2024,0,15)), frequency: "Mensual" };
    const pStart = new Date(Date.UTC(2024,0,1));
    const pEnd = new Date(Date.UTC(2024,0,31));
    const dates = getExpenseOccurrenceDatesInPeriod(exp, pStart, pEnd, false);
    assertEquals(1, dates.length, "One occurrence date in Jan 2024");
    assertEquals("2024-01-15", getISODateString(dates[0]), "Date is Jan 15" );
});
// Ensure summarizeTests() is the last call.
summarizeTests();
// End of test_app_logic.js
