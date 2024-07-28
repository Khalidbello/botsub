// helper funtion from user select networ offer

import { networkDetailsType } from "../../types/bot/module-buy-data-types";

const formDataOffers = async (networkInfo: networkDetailsType) => {
    const lenght = Object.keys(networkInfo).length;
    let text = `Select ${networkInfo['1'].network} data offer`;

    for (let i = 1; i < lenght + 1; i++) {
        text += `\n ${i}. ${networkInfo[i].size} ${networkInfo[i].validity}`;
    };

    return text;
};


export {
    formDataOffers,
}