import { Response } from 'express';
import { sendNewConversationResponse } from '../unified/send_new_user_message';
import sendMessageW from './send_message_w';
import { handleDefaultMessage } from '../unified/send_message_generic';

const processPostback = async (messageObj: any, res: Response): Promise<void> => {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true') {
    sendMessageW(
      messageObj.from,
      'Sorry network services are currenly down and would be restored by 10:30 PM'
    );
    return;
  }

  if (messageObj.postback.payload == 'newConversation') {
    sendNewConversationResponse(messageObj.from, 'WA');
    return;
  }

  let payload = messageObj.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) {
    console.error(err, 'no payload');
  }

  const payloadTitle = payload.title;
  console.log('postback payload title', payloadTitle);
  // handleDefaultMessage(messageObj.from, 'eeee', 'WA', );
}; // end of processPostback

export { processPostback };
