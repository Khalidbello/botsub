// route to handle admin related functionalities

const { Router } = require('express');
const {
    todaysStatistic,
    statistics,
    trendData,
    balances,
} = require('./../modules/admin/statistics.js');
const {
    getNetworkStatus,
    setNetworkStatus,
} = require('./../modules/admin/controls.js');


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
    try {
        await todaysStatistic(req, res);
    } catch (err) {
        console.log('error in todays statistics.......', err);
        res.send('something went wrong...............');
    };
});


router.get('/statistics/:startDate/:endDate', async (req, res) => {
    try {
        await statistics(req, res);
    } catch (err) {
        console.log('error in full statistics', err);
    };
});

router.get('/balances', async (req, res) => {
    try {
        await balances(req, res);
    } catch (err) {
        console.log('error in balances.............', err);
        res.send('an error occured');
    };
});


router.get('/trends/:range', (req, res) => {
    try {
        return trendData(req, res);
    } catch (err) {
        console.log('error occured in profits...........', err);
    };
});


// routes for controls
router.get('/network-status', async (req, res) => {
    try {
        return getNetworkStatus(req, res);
    } catch (err) {
        console.log('error occured in profits...........', err);
    };
});


router.post('/network-status', async (req, res) => {
    try {
        return setNetworkStatus(req, res);
    } catch (err) {
        console.log('error occured in profits...........', err);
    };
})

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