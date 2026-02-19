import { parsePhoneNumberFromString, PhoneNumber } from 'libphonenumber-js';
import { carrier } from 'libphonenumber-geo-carrier';

interface PhoneInfo {
  number: string;
  network: string;
}

/**
 * Uses Google's internal metadata to identify the network.
 * Handles inputs like +234, 234, or 0.
 */
export async function getNetworkAndLocalNumber(input: string): Promise<PhoneInfo> {
  let processedInput = input.trim();

  // Normalize: If user provides 23480... without a '+', add it.
  if (processedInput.startsWith('234') && !processedInput.startsWith('+')) {
    processedInput = '+' + processedInput;
  }

  // 1. Parse using Google's libphonenumber logic (defaulting to NG)
  const phoneNumber = parsePhoneNumberFromString(processedInput, 'NG');

  if (!phoneNumber || !phoneNumber.isValid()) {
    return { number: input, network: 'unknown' };
  }

  try {
    // 2. Use Google's carrier metadata to look up the network name
    // The 'en' specifies the return language
    const networkName = await carrier(phoneNumber, 'en');

    // 3. Format to local "0" format (e.g., 0803...)
    const localNumber = phoneNumber.formatNational().replace(/\s+/g, '');

    return {
      number: localNumber,
      network: networkName || 'unknown',
    };
  } catch (err) {
    console.error('An error occured in >>>>>>>>>>>>>>>>>>>>>>>>', err);
    return { number: input, network: 'unknown' };
  }
}

// Airtel 9mobile MTN Glo
