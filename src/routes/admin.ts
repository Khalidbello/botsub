// route to handle admin related functionalities
import { NextFunction, Request, Response, Router } from 'express';
import { balances, statistics, todaysStatistic, trendData } from '../modules/admin/statistics';
import {
  closeIssue,
  fetchIssues,
  fetchPedndingTransactions,
  getNetworkStatus,
  retryTransaction,
  sendIssueResponse,
  setNetworkStatus,
  settleTransaction,
} from '../modules/admin/controls';
import { retryAllFaledTransactions } from '../bot/modules/helper_function_2';
import adminRouter2 from './admin-2';

let autoRetry: boolean = true;

// function to create interval for failed transaction auto retry
const createFailedAuoRetryInterval = () => {
  const autoRetryIntervalId = setInterval(() => {
    console.log('intervalll auto retry');
    if (autoRetry) retryAllFaledTransactions();
  }, 1000 * 60 * 2); // two minutes for the interval

  console.log(
    'sucesfully created interval for auto retry, interval id is::::  ',
    autoRetryIntervalId
  );
};

// function to automatically set auto rety to true
const setAutoRetryTrue = () => {
  autoRetry = true;
};
//createFailedAuoRetryInterval();

const adminRouter = Router();

// middle ware to check if user is authenticated
function authChecker(req: any, res: Response, next: NextFunction) {
  console.log(req.session, 'sessions......');
  if (req.session.user) {
    if (req.session.user.authenticated === true && req.session.user.admin === true) {
      next();
    }
  } else {
    console.log('user not loggd in');
    res
      .status(401)
      .send('Unauthorized access: you do not have permission to request this resources........');
  }
}

adminRouter.post('/login', (req: any, res: Response) => {
  const { userName, password } = req.body;
  console.log(req.body, 'body');

  //console.log(userName, password, 'credentials.......', req.sessionID);
  if (userName === process.env.ADMIN_NAME && password === process.env.ADMIN_PASSWORD) {
    req.session.user = { authenticated: true, admin: true }; //{ user: userName, admin: true };
    console.log('res hadersssss........: ', res.getHeaders());
    res.status(200).json(req.session);
  } else {
    res.status(404).send('no user with detailsfound');
  }
});

adminRouter.post('/logout', (req: any, res: Response) => {
  // Destroy the session upon logout
  req.session.destroy((err: any) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ message: `somthing went wrong ${err}` });
    } else {
      res.json({ message: 'logged out successfully' });
    }
  });
});

// adminRouter.get('/login', (req, res) => {
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
adminRouter.use(authChecker);

adminRouter.get('/todays-statisitics', async (req: Request, res: Response) => {
  try {
    await todaysStatistic(req, res);
  } catch (err) {
    console.error('error in todays statistics.......', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

adminRouter.get('/statistics/:startDate/:endDate', async (req: Request, res: Response) => {
  try {
    await statistics(req, res);
  } catch (err) {
    console.error('error in full statistics', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

adminRouter.get('/balances', async (req: Request, res: Response) => {
  try {
    await balances(req, res);
  } catch (err) {
    console.error('error in balances.............', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

adminRouter.get('/trends/:range', (req: Request, res: Response) => {
  try {
    return trendData(req, res);
  } catch (err) {
    res.status(500).json({ data: 'an error occured' });
    console.error('error occured in profits...........', err);
  }
});

//===========*****routes for controls*******************************++++++++++++++++++++++++++++++++++++++++++++++++

// route to handle fetching network status
adminRouter.get('/network-status', async (req: Request, res: Response) => {
  try {
    return getNetworkStatus(req, res);
  } catch (err) {
    console.error('error occured in profits...........', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route to to set network status
adminRouter.post('/network-status', async (req: Request, res: Response) => {
  try {
    return setNetworkStatus(req, res);
  } catch (err) {
    console.error('error occured in profits...........', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route to send issue response from admin to user/reporter
adminRouter.post('/send-issue-response', async (req: Request, res: Response) => {
  try {
    return sendIssueResponse(req, res);
  } catch (err) {
    console.error('An error occured in admin send issue response', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route to handle fetching reported issues
adminRouter.get('/reported-issues/:pagging/:size', (req: Request, res: Response) => {
  try {
    return fetchIssues(req, res);
  } catch (err) {
    console.error('An error occured in reported issues admin', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route to handle retry transcion
adminRouter.get('/retry-transaction/:transactionId/:txRef', async (req: Request, res: Response) => {
  try {
    const { transactionId, txRef } = req.params;
    return retryTransaction(transactionId, txRef, res);
  } catch (err) {
    console.error('error in rerty transacton route', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route handle transaction close request
adminRouter.post('/close-issue/:issueId/:reporterId', async (req: Request, res: Response) => {
  try {
    return closeIssue(req, res);
  } catch (err) {
    console.error('An error occured in admin send issue response', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route to fetch pending transactions
adminRouter.get('/pending-transaction/:pagging/:size', async (req: Request, res: Response) => {
  try {
    const pagging = parseInt(req.params.pagging);
    const size = parseInt(req.params.size);

    return fetchPedndingTransactions(pagging, size, res);
  } catch (err) {
    console.error('an error occured while trying to fetch pending transction.......', err);
    res.status(500).json({ data: 'an error occured' });
  }
});

// route to settle transaction
adminRouter.get(
  '/settle-transaction/:transactionId/:senderId',
  async (req: Request, res: Response) => {
    try {
      settleTransaction(req.params.transactionId, req.params.senderId, res);
    } catch (err) {
      console.error('an error occured in settle transaction', err);
      res.status(500).json({ data: 'an error occured' });
    }
  }
);

// route to get the current value of auto retry
adminRouter.get('/get-auto-retry', (req: Request, res: Response) => {
  try {
    res.json({ autoRetry: autoRetry });
  } catch (err) {
    console.error('An error occured in get auto retry', err);
    res.status(500).send('An error occurde getting auto retry boolean');
  }
});

// route to turn on and off auto retry
adminRouter.post('/set-auto-retry', (req: Request, res: Response) => {
  try {
    const setTo = req.body.setTo;
    autoRetry = setTo;

    res.json({ settedTo: autoRetry });
  } catch (err) {
    console.error('error in setting auto retry', err);
    res.status(500).send('Something went wrong');
  }
});

adminRouter.use('/', adminRouter2);

export default adminRouter;

export { setAutoRetryTrue };
