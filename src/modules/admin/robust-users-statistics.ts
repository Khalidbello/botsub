import { Request, Response } from 'express';
import {
  countUsersWithPurchase,
  getAveProfitPerUser,
  getAveProfPerTrans,
  getAveTransPerUser,
  getMaxProfitPerUser,
  getMaxTransactionPerUser,
  getMinProfitPerUser,
  getMinTransactionPerUser,
  profitCount,
  totalProfitCount,
  transactionCount,
} from './helper-functions';

// handler for robust user specific statistics
const getRobustUserStatistics = async (req: Request, res: Response) => {
  try {
    const startDate = new Date(req.params.startDate);
    const endDate = new Date(req.params.endDate);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const [
      totalProfi,
      numOfTransactions,
      numOfUsersWithPurchase,
      maxProfitPerUser5,
      minProfitPerUser5,
      maxNumOfTransactiosnPerUser5,
      minNumOfTransactiosnPerUser5,
      averageProfitPerUser,
      averageProfitPerTransaction,
      averageTransactionPerUser,
    ] = await Promise.all([
      profitCount(startDate, endDate),
      totalProfitCount(startDate, endDate),
      countUsersWithPurchase(startDate, endDate),
      getMaxProfitPerUser(startDate, endDate),
      getMinProfitPerUser(startDate, endDate),
      getMaxTransactionPerUser(startDate, endDate),
      getMinTransactionPerUser(startDate, endDate),
      getAveProfitPerUser(startDate, endDate),
      getAveProfPerTrans(startDate, endDate),
      getAveTransPerUser(startDate, endDate),
    ]);

    res.json({
      totalProfi,
      numOfTransactions,
      numOfUsersWithPurchase,
      maxProfitPerUser5,
      minProfitPerUser5,
      maxNumOfTransactiosnPerUser5,
      minNumOfTransactiosnPerUser5,
      averageProfitPerUser,
      averageProfitPerTransaction,
      averageTransactionPerUser,
    });
  } catch (err) {
    res.status(500).json({ error: 'An occured trying to get user specific statistics.' });
    console.error('An error occured in getRobustUserStatistics', err);
  }
};

export { getRobustUserStatistics };
