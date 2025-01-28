import { Request, Response } from 'express';
import {
  average,
  pendingCount,
  profitCount,
  successfulCount,
  transactionCount,
} from './helper-functions';
import PaymentAccounts from '../../models/payment-accounts';
import axios from 'axios';
import {
  getDataWalletBalance,
  getFlutterWaveBalance,
  getVirtualAccountBalances,
} from './helper-function2';

async function todaysStatistic(req: Request, res: Response) {
  const day = new Date();
  const startDate = new Date(day);
  const endDate = new Date(day);

  startDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(23, 59, 59, 999);

  const [count, sucessful, pending, profit] = await Promise.all([
    transactionCount(startDate, endDate),
    successfulCount(startDate, endDate),
    pendingCount(startDate, endDate),
    profitCount(startDate, endDate),
  ]);

  res.status(200).json({
    total: count,
    succcessful: sucessful,
    pending: pending,
    profit: profit,
  });
} // end of todays Statistics

// function to search for all statistics total, succesfull, pending, average transaction perday, profit
async function statistics(req: Request, res: Response) {
  const start = req.params.startDate;
  const end = req.params.endDate;
  const startDate = new Date(start);
  const endDate = new Date(end);

  startDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(23, 59, 59, 999);

  const [count, sucessful, pending, profit, ave] = await Promise.all([
    transactionCount(startDate, endDate),
    successfulCount(startDate, endDate),
    pendingCount(startDate, endDate),
    profitCount(startDate, endDate),
    average(startDate, endDate),
  ]);

  //console.log(count, pending, sucessful, profit, 'average.........', ave, startDate, endDate);
  res.status(200).json({
    total: count,
    succcessful: sucessful,
    pending: pending,
    profit: profit,
    average: ave,
  });
} // end of statistics

// function to handle data for trend plotting
async function trendData(req: Request, res: Response) {
  const range = parseInt(req.params.range);
  const todaysDate = new Date();
  const dates = [];
  const numTrans = [];
  const profits = [];

  for (let i = 0; i < range; i++) {
    const date = new Date();
    date.setDate(todaysDate.getDate() - i);
    const startDate = new Date(date);
    const endDate = new Date(date);
    const dateString = date.toISOString();
    const dateStringWithoutT = dateString.split('T')[0];
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const [count, profit] = await Promise.all([
      transactionCount(startDate, endDate),
      profitCount(startDate, endDate),
    ]);

    dates.unshift(dateStringWithoutT);
    numTrans.unshift(count);
    profits.unshift(profit * 0.1);
    //console.log(i, 'in prifts trends');
  }
  res.json({
    dates,
    numTrans,
    profits,
  });
} // end of graphData

// function to handle balances
async function balances(req: Request, res: Response) {
  const virtualAccountBalance = PaymentAccounts.aggregate([
    { $match: {} },
    {
      $group: {
        _id: 'virtual account',
        totalBalance: { $sum: '$balance' },
      },
    },
  ]);

  const [vBalance] = await Promise.all([virtualAccountBalance]);
  const platformBalance = 5000;

  res.json({
    virtualAccountBalance: vBalance[0]?.totalBalance || 0,
    platformBalance,
  });
} // end of balances

// handler to handle wallet balance request and data platform balance request
const getBalances = async (req: Request, res: Response) => {
  try {
    const [dataWalletBalance, flutterWaveBalances, virtualAccountBalance] = await Promise.all([
      getDataWalletBalance(),
      getFlutterWaveBalance(),
      getVirtualAccountBalances(),
    ]);

    console.log(
      'balances in getBalances: ',
      dataWalletBalance,
      flutterWaveBalances,
      virtualAccountBalance
    );
    res.json({
      dataWalletBalance,
      transferableBalance: flutterWaveBalances ? flutterWaveBalances[0] : 0,
      ledgerBalance: flutterWaveBalances ? flutterWaveBalances[1] : 0,
      virtualAccountBalance,
    });
  } catch (err) {
    console.error('An error occured in :', getBalances);
    res.status(500).json('An error occured in : ');
  }
};

export { todaysStatistic, trendData, balances, statistics, getBalances };
