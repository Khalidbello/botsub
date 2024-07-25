const Transactions = require('./../../models/transactions.js');
const Profits = require('./../../models/profits.js');
const PaymentAccounts = require('./../../models/payment-accounts.js');


// function to count all transactions
async function transactionCount(startDate, endDate) {
    const count = await Transactions.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
            $count: 'totalCount'
        }
    ]);

    return count[0]?.totalCount || 0;
}; // end of transactionCount


// function to count pending transactions
async function pendingCount(startDate, endDate) {
    const count = await Transactions.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate },
                status: false,
            }
        },
        { $count: 'pendingTransCount' }
    ]);

    return count[0]?.pendingTransCount || 0;
}; // end of pendingCount


// function to count successful transactions
async function successfulCount(startDate, endDate) {
    const count = await Transactions.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate },
                status: true,
            }
        },
        { $count: 'successfulTransCount' }
    ]);

    return count[0]?.successfulTransCount || 0;
}; // end of successfulCount


//  function to count profits
async function profitCount(startDate, endDate) {
    const profit = await Profits.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
            $group: {
                _id: startDate,
                totalProfit: { $sum: '$amount' }
            }
        }
    ]);

    let value = profit[0]?.totalProfit || 0;
    value = parseFloat(value.toFixed(2))
    return value;
}; // end of profit count


// function to calculate average transactions per day
async function average(startDate, endDate) {
    const timeDifference = endDate.getTime() - startDate.getTime(); // Corrected calculation
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    const transactions = await transactionCount(startDate, endDate);
    let value = transactions / daysDifference;
    value = parseFloat(value.toFixed(2))
    return value;
};


export {
    transactionCount,
    pendingCount,
    successfulCount,
    profitCount,
    average
}