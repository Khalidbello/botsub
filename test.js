
// helper function to check if user whatsapp user can recieve messge
const canIsendWhatsappUserMessage = async (lastMessage) => {
    const lastMessageDate = new Date(lastMessage);
    const nowDate = new Date();
  
    const millisecondsIn24Hours = 24 * 60 * 60 * 1000;
    const difference = Math.abs(nowDate.getTime() - lastMessageDate.getTime());
    console.log('time difference in isConversationOpenW : ', difference);
  
    return difference < millisecondsIn24Hours;
  };

  console.log(canIsendWhatsappUserMessage('2025-02-21T21:43:57.215+00:00'))