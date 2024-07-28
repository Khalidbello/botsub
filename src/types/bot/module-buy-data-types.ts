type networkDetailsType = {
    [keys: string]: dataOfferType;
};

type dataOfferType = {
    networkID: number;
    planID: number;
    size: string;
    price: number;
    aPrice: number;
    validity: string;
    index: string;
    network: string;
};




export type {
    networkDetailsType,
    dataOfferType,
};