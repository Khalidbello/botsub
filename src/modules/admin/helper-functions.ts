import Profits from '../../models/profits';
import Transactions from '../../models/transactions';

// function to count all transactions
async function transactionCount(startDate: Date, endDate: Date) {
  const count = await Transactions.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
      $count: 'totalCount',
    },
  ]);

  return count[0]?.totalCount || 0;
} // end of transactionCount

// function to count pending transactions
async function pendingCount(startDate: Date, endDate: Date) {
  const count = await Transactions.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: 'refunded',
      },
    },
    { $count: 'refundedTransCount' },
  ]);

  return count[0]?.pendingTransCount || 0;
} // end of pendingCount

// function to count successful transactions
async function successfulCount(startDate: Date, endDate: Date) {
  const count = await Transactions.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: 'delivered',
      },
    },
    { $count: 'successfulTransCount' },
  ]);

  return count[0]?.successfulTransCount || 0;
} // end of successfulCount

//  function to count profits
async function profitCount(startDate: Date, endDate: Date) {
  const profit = await Profits.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: startDate,
        totalProfit: { $sum: '$amount' },
      },
    },
  ]);

  let value = profit[0]?.totalProfit || 0;
  value = parseFloat(value.toFixed(2));
  return value;
} // end of profit count

// function to calculate average transactions per day
async function average(startDate: Date, endDate: Date) {
  const timeDifference = endDate.getTime() - startDate.getTime(); // Corrected calculation
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  const transactions = await transactionCount(startDate, endDate);
  let value = transactions / daysDifference;
  value = parseFloat(value.toFixed(2));
  return value;
}

export { transactionCount, pendingCount, successfulCount, profitCount, average };
