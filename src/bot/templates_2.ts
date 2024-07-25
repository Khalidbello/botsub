// second templates file as first template file got too long

// referral bonus network template
function referralOffers1(refereeId) {
    const temp = {
        type: 'template',
        payload: {
            template_type: 'button',
            text: 'Select Network for referral bonus',
            buttons: [
                {
                    type: 'postback',
                    title: 'MTN 150MB',
                    payload: `{"title": "referralBonusOfferSelected", "network": "MTN", "size": "150MB", "networkID": "1", "planID": "40004", "refereeId": "${refereeId}"}`,
                },
                {
                    type: 'postback',
                    title: 'Airtel 100MB',
                    payload: '{"title": "referralBonusOfferSelected", "network": "Airtel", "size": "100MB", "networkID": "3", "planID": "40004", "refereeId": "${refereeId}"}'
                },
            ],
        },
    };
    return temp;
}; // end of referralOffers1


function referralOffers2(refereeId) {
    const temp = {
        type: 'template',
        payload: {
            template_type: 'button',
            text: '---',
            buttons: [
                {
                    type: 'postback',
                    title: 'Glo 200MB',
                    payload: `{"title": "referralBonusOfferSelected", "network": "Glo", "size": "200MB", "networkID": "2", "planID": "40004", "refereeId": "${refereeId}"}`,
                },
                {
                    type: 'postback',
                    title: '9mobile 500MB',
                    payload: '{"title": "referralBonusOfferSelected", "network": "9mobile", "size": "500MB", "networkID": "4", "planID": "40004", "refereeId": "${refereeId}"}'
                },
            ],
        },
    };
    return temp;
}; // end of referralOffers2


// function to form confirm referral bonus template
const referralTemp = {
    type: 'template',
    payload: {
        template_type: 'button',
        text: 'Select action',
        buttons: [
            {
                type: 'postback',
                title: 'Claim Bonus',
                payload: `{"title": "deliverReferralBonus"}`,
            },
            {
                type: 'postback',
                title: 'Change Phone Number',
                payload: '{"title": "changeReferralBonusPhoneNumber"}'
            },
            {
                type: 'postback',
                title: 'Cancle',
                payload: `{"title": "cancel"}`,
            }
        ],
    },
};



export {
    referralOffers1,
    referralOffers2,
    referralTemp,
};