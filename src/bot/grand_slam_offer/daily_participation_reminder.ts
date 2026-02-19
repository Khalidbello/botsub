import WhatsappBotUsers from '../../models/whatsaap_bot_users';
import sendMessageW from '../whatsaap_bot/send_message_w';
import { isSameMonth, subMonths } from 'date-fns';

function isPreviousMonth(date: Date, currentDate: Date): boolean {
  const previousMonth = subMonths(currentDate, 1);
  return isSameMonth(date, previousMonth);
}

// Type definitions for better type safety
interface BotUserType {
  email: string;
  id: string;
  lastOfferReminder: Date;
  lastMessage: Date;
  transactNum: number;
  win?: Date;
  claimed?: Date;
  monthOfTransaction: Date;
  lastLostOfferReminder: Date;
  numberOfTransactionForMonth?: number;
  purchasePayload: {
    product: string;
    network: string;
    price: number;
    phoneNumber: string;
    transactionType: string;
    size: string;
    index: string;
    planID: number;
    networkID: number;
    refereeId: number;
    outStanding: boolean;
    platform: string;
    free3GBNetwork: string;
    free3GBPhoneNumber: string;
    free3GBNetworkId: number;
    free3GBPlanId: number;
  };
  withdrawalData: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
    amount: number;
    bank: { id: number; code: string; name: string };
    bankListing: [{ id: number; code: string; name: string }];
  };
}

export { BotUserType };
