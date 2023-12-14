// second templates file as first template file got too long

// referral bonus network template
const referralOffers1 = {
    type: 'template',
    payload: {
        template_type: 'button',
        text: 'Select Network for referral bonus',
        buttons: [
            {
                type: 'postback',
                title: 'MTN 100MB',
                payload: '{"title": "mtnOffers", "networkID": "1", "plandID": "40004"}',
            },
            {
                type: 'postback',
                title: 'Airtel 100MB',
                payload: '{"title": "referralAirtelOffers", "networkID": "1", "plandID": "40004"}'
            },
        ],
    },
};


const referralOffers2 = {
    type: 'template',
    payload: {
        template_type: 'button',
        text: '...',
        buttons: [
            {
                type: 'postback',
                title: 'Glo 200MB',
                payload: '{"title": "referralGloOffers", "networkID": "1", "plandID": "40004"}'
            },
            {
                type: 'postback',
                title: '9mobile 500MB',
                payload: '{"title": "rferral9mobileOffers", "networkID": "1", "plandID": "40004"}'
            }
        ],
    },
}; // end of dataNetworks


module.exports = {
    referralOffers1,
    referralOffers2
};