import Profits from '../../models/profits';
import Transactions from '../../models/transactions';

// function to calculate everage trasction per user
const getAveTransPerUser = async (startDate: Date, endDate: Date) => {
  try {
    const result = await Profits.aggregate([
      {
        $match: {
          $gte: startDate,
          $lte: endDate,
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

export { getAveTransPerUser };
