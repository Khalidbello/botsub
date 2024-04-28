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
    sendIssueResponse,
    fetchIssues,
    closeIssue,
    fetchPedndingTransactions,
    retryTransaction,
    settleTransaction
} = require('./../modules/admin/controls.js');


const router = Router();

// middle ware to check if user is authenticated
function authChecker(req, res, next) {
    console.log(req.session, 'sessions......');
    if (req.session.user) {
        if (req.session.user.authenticated === true && req.session.user.admin === true) {
            next();
        }
    } else {
        console.log('user not loggd in');
        res.status(401).send('acces denied: You do not have permission to access this resource');
    }
};


router.post('/login', (req, res) => {
    const { userName, password } = req.body; console.log(req.body, 'body');

    //console.log(userName, password, 'credentials.......', req.sessionID);
    if ((userName === process.env.ADMIN_NAME) && (password === process.env.ADMIN_PASSWORD)) {
        req.session.user = { authenticated: true, admin: true }; //{ user: userName, admin: true };
        res.status(200).json(req.session);
        consol.log(req.session);
    } else {
        res.status(401).send('Unauthorized: Wrong password');
    };
});

router.post('/logout', (req, res) => {
    // Destroy the session upon logout
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ message: `somthing went wrong ${err}` });
        } else {
            res.json({ message: 'logged out successfully' });
        }
    });
});

// router.get('/login', (req, res) => {
//     if (req.session.user) {
//         console.log('redirected to home');
//         return res.redirect('/');
//     };

//     const { userName, password } = req.body; console.log(req.body, 'body');
//     console.log(userName, password, 'credentials.......', req.sessionID);
//     if (true || ((userName === 'ok') && (password === '123'))) {
//         req.session.user = { authenticated: true, admin: true }; //{ user: userName, admin: true };
//         res.status(200).json(req.session);
//         console.log(req.session);
//     } else {
//         res.status(401).send('Unauthorized: Wrong password');
//     };
// });


// check if requester has admin permission
router.use(authChecker);

router.get('/todays-statisitics', async (req, res) => {
    try {
        await todaysStatistic(req, res);
    } catch (err) {
        console.log('error in todays statistics.......', err);
        res.status(500).json({ data: 'an error occured' });
    };
});


router.get('/statistics/:startDate/:endDate', async (req, res) => {
    try {
        await statistics(req, res);
    } catch (err) {
        console.log('error in full statistics', err);
        res.status(500).json({ data: 'an error occured' });
    };
});

router.get('/balances', async (req, res) => {
    try {
        await balances(req, res);
    } catch (err) {
        console.log('error in balances.............', err);
        res.status(500).json({ data: 'an error occured' });
    };
});


router.get('/trends/:range', (req, res) => {
    try {
        return trendData(req, res);
    } catch (err) {
        res.status(500).json({ data: 'an error occured' });
        console.log('error occured in profits...........', err);
    };
});




//===========*****routes for controls*******************************++++++++++++++++++++++++++++++++++++++++++++++++


// route to handle fetching network status
router.get('/network-status', async (req, res) => {
    try {
        return getNetworkStatus(req, res);
    } catch (err) {
        console.log('error occured in profits...........', err);
        res.status(500).json({ data: 'an error occured' });
    };
});


// route to to set network status
router.post('/network-status', async (req, res) => {
    try {
        return setNetworkStatus(req, res);
    } catch (err) {
        console.log('error occured in profits...........', err);
        res.status(500).json({ data: 'an error occured' });
    };
});


// route to send issue response from admin to user/reporter
router.post('/send-issue-response', async (req, res) => {
    try {
        return sendIssueResponse(req, res);
    } catch (err) {
        console.log('An error occured in admin send issue response', err);
        res.status(500).json({ data: 'an error occured' });
    }
})


// route to handle fetching reported issues
router.get('/reported-issues/:pagging/:size', (req, res) => {
    try {
        return fetchIssues(req, res);
    } catch (err) {
        console.log('An error occured in reported issues admin', err);
        res.status(500).json({ data: 'an error occured' });
    }
});



// route to handle retry transcion
router.get('/retry-transaction/:transactionId/:txRef', async (req, res) => {
    try {
        const { transactionId, txRef } = req.params;
        return retryTransaction(transactionId, txRef, res);
    } catch (err) {
        console.log('error in rerty transacton route', err);
        res.status(500).json({ data: 'an error occured' });
    }
})


// route handle transaction close request
router.get('/close-issue/:issueId', async (req, res) => {
    try {
        return closeIssue(req, res);
    } catch (err) {
        console.log('An error occured in admin send issue response', err);
        res.status(500).json({ data: 'an error occured' });
    }
})


// route to fetch pending transactions
router.get('/pending-transaction/:pagging/:size', async (req, res) => {
    try {
        const pagging = parseInt(req.params.pagging);
        const size = parseInt(req.params.size);

        return fetchPedndingTransactions(pagging, size, res);
    } catch (err) {
        console.log('an error occured while trying to fetch pending transction.......', err)
        res.status(500).json({ data: 'an error occured' });
    }
})


// route to handle transaction retry
router.get('/settle-transaction/:transactionId/:senderId', async (req, res) => {
    try {
        settleTransaction(req.params.transactionId, req.params.senderId, res);
    } catch (err) {
        console.log('an error occured in settle transaction', err);
        res.status(500).json({ data: 'an error occured' });
    }
});





module.exports = router;