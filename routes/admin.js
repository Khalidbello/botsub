// route to handle admin related functionalities

const { Router } = require('express');
const Transactions = require('./../models/transactions.js');
const Profits = require('./../models/profits.js');
const PaymentAccounts = require('./../models/payment-accounts.js');

const router = Router();

// middle ware to check if user is authenticated
function authChecker(req, res, next) {
    if (req.session.user && req.session.admin) {
        next();
    } else {
        res.status(403).send('Forbidden: You do not have permission to access this resource');
    }
};

// check if use has admin acess
//router.use(authChecker);

router.get('/todays-statisitics', async (req, res) => {
    const day = new Date('2024-04-07');
    const startOfDay = new Date(day);
    const endOfDay = new Date(day);

    startOfDay.setUTCHours(0, 0, 0, 0);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const transactionCount = Transactions.aggregate([
        { $match: { date: { $gte: startOfDay, $lte: endOfDay } } },
        {
            $count: 'totalCount'
        }
    ]);

    const pendingTransactionCount = Transactions.aggregate([
        {
            $match: {
                date: { $gte: startOfDay, $lte: endOfDay },
                status: false,
            }
        },
        { $count: 'pendingTransCount' }
    ]);

    const succesfullTransactionCount = Transactions.aggregate([
        {
            $match: {
                date: { $gte: startOfDay, $lte: endOfDay },
                status: true,
            }
        },
        { $count: 'succesfulTrans' }
    ]);

    const todaysProfit = Profits.aggregate([
        { $match: { date: { $gte: startOfDay, $lte: endOfDay } } },
        {
            $group: {
                _id: day,
                totalProfitToday: { $sum: '$amount' }
            }
        }
    ]);

    const [count, pending, sucessful, profit] = await Promise.all([transactionCount, pendingTransactionCount, succesfullTransactionCount, todaysProfit])

    console.log(count, pending, sucessful, profit);
    res.status(200).json({
        total: count[0]?.totalCount || 0,
        succcessful: sucessful[0]?.succesfulTrans || 0,
        pending: pending[0]?.pendingTransCount || 0,
        profit: profit[0]?.totalProfitToday || 0,
    });
});


router.get('/balances', async (req, res) => {
    const virtualAccountBalance = PaymentAccounts.aggregate([
        { $match: {} },
        {
            $group: {
                _id: 'virtual account',
                totalBalance: { $sum: '$balance' }
            }
        }
    ]);

    const [vBalance] = await Promise.all([virtualAccountBalance]);
    const platformBalance = 5000;

    res.json({
        virtualAccountBalance: vBalance[0]?.totalBalance || 0,
        platformBalance
    });
});


router.get('/profits/:days', (req, res) => {
    const days = Number(req.params);
    const today = new Date();

    const profits = Profit.find({}, {});
    res.json(profits);
});


router.post('/logout', (req, res) => {
    // Destroy the session upon logout
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            res.send('Logged out successfully');
        }
    });
})

module.exports = router;