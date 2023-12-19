// second templates file as first template file got too long

// referral bonus network template
function referralOffers1(referralId) {
    const temp = {
        type: 'template',
        payload: {
            template_type: 'button',
            text: 'Select Network for referral bonus',
            buttons: [
                {
                    type: 'postback',
                    title: 'MTN 100MB',
                    payload: `{"title": "referralMtnOffers", "networkID": "1", "plandID": "40004", "referralId": "${referralId}"}`,
                },
                {
                    type: 'postback',
                    title: 'Airtel 100MB',
                    payload: '{"title": "referralAirtelOffers", "networkID": "3", "plandID": "40004", "referralId": "${referralId}"}'
                },
            ],
        },
    };
    return temp;
}; // end of referralOffers1


function referralOffers2(referralId) {
    const temp = {
        type: 'template',
        payload: {
            template_type: 'button',
            text: '---',
            buttons: [
                {
                    type: 'postback',
                    title: 'Glo 200MB',
                    payload: `{"title": "referralGloOffers", "networkID": "2", "plandID": "40004", "referralId": "${referralId}"}`,
                },
                {
                    type: 'postback',
                    title: '9mobile 500MB',
                    payload: '{"title": "referral9mobileOffers", "networkID": "4", "plandID": "40004", "referralId": "${referralId}"}'
                },
            ],
        },
    };
    return temp;
}; // end of referralOffers2


module.exports = {
    referralOffers1,
    referralOffers2
};