import { defaultMessageHandlerW } from './message-responses/generic';
import sendMessageW from './send_message_w';
import { Response } from 'express';
import { sendNewConversationResponseW } from './post-back-responses/postback_responses';

const processPostback = async (messageObj: any, res: Response): Promise<void> => {
  // first set nextAction to null
  if (process.env.botMaintenance === 'true')
    return sendMessageW(
      messageObj.from,
      'Sorry network services are currenly down and would be restored by 10:30 PM'
    );

  if (messageObj.postback.payload == 'newConversation') {
    return sendNewConversationResponseW(messageObj);
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
  return defaultMessageHandlerW(messageObj, true, 0);
}; // end of processPostback

export { processPostback };
