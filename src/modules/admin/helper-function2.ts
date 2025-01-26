import Profits from '../../models/profits';
import Transactions from '../../models/transactions';

// fucntion to getaverage profit per user with in specific timefrae
const getAveProfitPerUser = async (startDate: Date, endDate: Date) => {
  try {
    const result = await Profits.aggregate([
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
          profitSum: { $sum: '$amount' },
        },
      },
      {
        $group: {
          _id: null,
          aveProfitPerUser: { $avg: '$profitSum' },
        },
      },
    ]);

    if (result.length < 1) return 0;
    return result[0].aveProfitPerUser;
  } catch (err) {
    console.error('An error occured in getAveProfitPerUser: ', err);
    throw err;
  }
};

// function to calculate averge prrofit per trnacton
const getAveProfPerTrans = async (startDate: Date, endDate: Date) => {
  try {
    const result = await Profits.aggregate([
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
          _id: null,
          totalProfit: { $sum: '$amount' },
          totalTransaction: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          aveProfitPerTrans: { $divide: ['$totalProfit', '$totalTransaction'] },
        },
      },
    ]);

    if (result.length < 1) return 0;
    return result[0].aveProfitPerTrans;
  } catch (err) {
    console.error('An error occured in getAveProfPerTrans: ', err);
    throw err;
  }
};

// function to calculate everage trasction per user
const getAveTransPerUser = async (startDate: Date, endDate: Date) => {
  try {
    const result = await Profits.aggregate([
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
          transNum: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          averageTransPerUser: { $avg: '$transNum' },
        },
      },
    ]);

    if (result.length < 1) return 0;
    return result[0].averageTransPerUser;
  } catch (err) {
    console.error('An error occured in getAveTransPerUser: ', err);
    throw err;
  }
};

export { getAveTransPerUser, getAveProfitPerUser, getAveProfPerTrans };
