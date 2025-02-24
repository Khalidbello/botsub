
FLW_PB_KEY_PRODUCTION  = 'FLWPUBK-590aaa094196a6eb6991ba317e109044-X'
FLW_SCRT_KEY_PRODUCTION = 'FLWSECK-7f22111f57ae63ee3cbed6305979cfa3-190cfda5185vt-X'


const Flutterwave = require('flutterwave-node-v3');

const flw = new Flutterwave(FLW_PB_KEY_PRODUCTION, FLW_SCRT_KEY_PRODUCTION );

const createVirtualAccount = async () => {
    try {
        const payload = {
            "email": "user@example.com",
            "is_permanent": true,
            "bvn": "69607417179", // BVN is required here
            "tx_ref": "unique-transaction-reference",
            "narration": "John Doe",
            "firstname": "John",
            "lastname": "Doe",
            "phonenumber": "08012345678",
            "amount": 1000
        };

        const response = await flw.VirtualAcct.create(payload);
        console.log(response);
    } catch (error) {
        console.error(error);
    }
};

createVirtualAccount();