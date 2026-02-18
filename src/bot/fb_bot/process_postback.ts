import { sendMessage } from './modules/send_message';
import { Response } from 'express';
import { sendNewConversationResponse } from '../unified/send_new_user_message';

const processPostback = async (event: any, res: Response): Promise<void> => {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true') {
    sendMessage(event.sender.id, {
      text: 'Sorry network services are currenly down and would be restored by 10:30 PM',
    });
    return;
  }

  if (event.postback.payload == 'newConversation') {
    return await sendNewConversationResponse(event.sender.id, 'FB');
  }

  let payload = event.postback.payload;
  try {
    payload = JSON.parse(payload);
    console.log('postback payload', payload);
  } catch (err) {
    console.error(err, 'no payload');
  }

  const payloadTitle = payload.title;
  console.log('postback payload title', payloadTitle);
  //defaultMessageHandler(event, true, 0);
  return;
}; // end of processPostback

export { processPostback };
