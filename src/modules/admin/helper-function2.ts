import axios from 'axios';
import Profits from '../../models/profits';
import Transactions from '../../models/transactions';
import PaymentAccounts from '../../models/payment-accounts';

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

// helper function to get data wallet balance
const getDataWalletBalance = async () => {
  try {
    const options = {
      method: 'GET',
      url: 'https://opendatasub.com/api/user/',
      headers: {
        Authorization: `Token ${process.env.OPENSUB_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await axios.request(options);
    console.log('orpendat user rsposne: ', response.data.user);

    return response?.data?.user?.wallet_balance;
  } catch (err) {
    console.error('An error occured in getDataWalletBalance : ', err);
  }
};

// helper function to get wallet balance request and data platform balance request
const getFlutterWaveBalance = async () => {
  try {
    const options = {
      method: 'GET',
      url: 'https://api.flutterwave.com/v3/balances/NGN',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.FLW_SCRT_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await axios.request(options);
    // console.log('resposne in getWallet balane: ', response.data);

    return [response?.data?.data?.available_balance, response?.data?.data?.ledger_balance];
  } catch (err) {
    console.error('An error occured in getFlutterWaveBalance : ', err);
  }
};

// function to get virtual account balances
const getVirtualAccountBalances = async () => {
  try {
    const virtualAccountBalance = await PaymentAccounts.aggregate([
      { $match: {} },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
        },
      },
    ]);

    //console.log('Virtual account balance: ', virtualAccountBalance);
    return virtualAccountBalance[0] ? virtualAccountBalance[0].totalBalance : 0;
  } catch (err) {
    console.error('An error occured in getVirtualAccountBalances : ', err);
  }
};

export {
  getAveTransPerUser,
  getAveProfitPerUser,
  getAveProfPerTrans,
  getDataWalletBalance,
  getFlutterWaveBalance,
  getVirtualAccountBalances,
};
