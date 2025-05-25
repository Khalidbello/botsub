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
import WhatsappBotUsers from '../../models/whatsaap_bot_users';

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

// function to handle fetch whatsapp users
const handleFetchWhatsappUsers = async (req: Request, res: Response) => {
  try {
    const startDateParam = req.params.startDate;
    const endDateParam = req.params.endDate;
    const limitParam = req.params.limit;
    const marginParam = req.params.margin;

    // Input Validation
    if (!startDateParam || !endDateParam || !limitParam || !marginParam) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    const limit = parseInt(limitParam);
    const margin = parseInt(marginParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(limit) || isNaN(margin)) {
      return res.status(400).json({ error: 'Invalid parameter format.' });
    }

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const users = await WhatsappBotUsers.find({
      lastMessage: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .limit(limit)
      .skip(margin)
      .select('transactNum lastTransact lastMessage email nextAction createdAt -_id');

    res.json({ users });
  } catch (err) {
    console.error('An error occurred in handleFetchWhatsappUsers', err);
    res.status(500).json({ error: 'An error occurred trying to get WhatsApp users.' });
  }
};

export { getRobustUserStatistics, handleFetchWhatsappUsers };
