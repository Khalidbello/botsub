import { Request, Response } from 'express';
import { generateRandomString } from '../../modules/helper_functions';
import { generateOneTimeAccountHelper } from '../../bot/modules/helper_function_2';

const generateOneTimeAccount = async (req: Request, res: Response) => {
  const datas = req.body;
  try {
    const response = await generateOneTimeAccountHelper(datas);
    res.json(response);
  } catch (err) {
    console.log('transfer accoun err', err);
    res.json({ status: 'error' });
  }
};

export default generateOneTimeAccount;
