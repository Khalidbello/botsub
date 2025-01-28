import Profits from '../../models/profits';
import Transactions from '../../models/transactions';
import { getAveProfitPerUser, getAveProfPerTrans, getAveTransPerUser } from './helper-function2';

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
        status: 'failed',
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

///==========================================================================================
// user specific helpers

// count number of user that made purchse
const countUsersWithPurchase = async (startDate: Date, endDate: Date) => {
  try {
    const result = await Transactions.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$senderId',
        },
      },
      {
        $count: 'uniqueUserCount',
      },
    ]);

    if (result.length < 1) return 0;
    return result[0].uniqueUserCount;
  } catch (err) {
    console.error('An error occured in countUsersWithPurchase: ', err);
    throw err;
  }
};

// get max profit profit per user for speific time frame
const getMaxProfitPerUser = async (startDate: Date, endDate: Date) => {
  // query to return top five with highest amount of profit for specific time frame
  try {
    const result = await Profits.aggregate([
      // stage one
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      // stage two
      {
        $group: {
          _id: '$senderId',
          totalProfit: { $sum: '$amount' },
        },
      },
      // stage three
      {
        $sort: {
          totalProfit: -1,
        },
      },
      // stage four
      {
        $limit: 5,
      },
      // stage five
      {
        $project: {
          _id: 1,
          maxProfit: '$totalProfit',
        },
      },
    ]);

    return result;
  } catch (err) {
    console.error('An error occured in getMaxProfitPerUser: ', err);
    throw err;
  }
};

// get min profit profit per user for speific time frame
const getMinProfitPerUser = async (startDate: Date, endDate: Date) => {
  // query to return top five with highest amount of profit for specific time frame
  try {
    const result = await Profits.aggregate([
      // stage one
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      // stage two
      {
        $group: {
          _id: '$senderId',
          totalProfit: { $sum: '$amount' },
        },
      },
      // stage three
      {
        $sort: {
          totalProfit: 1,
        },
      },
      // stage four
      {
        $limit: 5,
      },
      // stage five
      {
        $project: {
          _id: 1,
          minProfit: '$totalProfit',
        },
      },
    ]);

    return result;
  } catch (err) {
    console.error('An error occured in getMaxProfitPerUser: ', err);
    throw err;
  }
};

// get max profit profit per user for speific time frame
const getMaxTransactionPerUser = async (startDate: Date, endDate: Date) => {
  // query to return top five with highest amount of profit for specific time frame
  try {
    const result = await Profits.aggregate([
      // stage one
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      // stage two
      {
        $group: {
          _id: '$senderId',
          transactionCount: { $sum: 1 },
        },
      },
      //stage three
      {
        $sort: {
          transactionCount: -1,
        },
      },
      //stage four
      {
        $limit: 5,
      },
      //stage five
      {
        $project: {
          _id: 1,
          transactionCount: 1,
        },
      },
    ]);

    return result;
  } catch (err) {
    console.error('An error occured in getMaxProfitPerUser: ', err);
    throw err;
  }
};

// get max profit profit per user for speific time frame
const getMinTransactionPerUser = async (startDate: Date, endDate: Date) => {
  // query to return top five with highest amount of profit for specific time frame
  try {
    const result = await Profits.aggregate([
      // stage one
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      // stage two
      {
        $group: {
          _id: '$senderId',
          transactionCount: { $sum: 1 },
        },
      },
      // stage three
      {
        $sort: {
          transactionCount: 1,
        },
      },
      // stage four
      {
        $limit: 5,
      },
      // stage five
      {
        $project: {
          _id: 1,
          transactionCount: 1,
        },
      },
    ]);

    return result;
  } catch (err) {
    console.error('An error occured in getMaxProfitPerUser: ', err);
    throw err;
  }
};

// function to count all profit count
async function totalProfitCount(startDate: Date, endDate: Date) {
  const count = await Profits.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
      $count: 'totalCount',
    },
  ]);

  return count[0]?.totalCount || 0;
} // end of transactionCount
export {
  transactionCount,
  pendingCount,
  successfulCount,
  profitCount,
  average,
  countUsersWithPurchase,
  getMaxProfitPerUser,
  getMinProfitPerUser,
  getMaxTransactionPerUser,
  getMinTransactionPerUser,
  totalProfitCount,
  getAveProfitPerUser,
  getAveProfPerTrans,
  getAveTransPerUser,
};
