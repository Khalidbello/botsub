// require('dotenv').config();
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const transactions = require('./models/transactions');
// const botUsers = require('./models/fb_bot_users.js');
// const connectDB = require('./models/connectdb.js');

// //const uri = `mongodb+srv://bellokhalid74:${process.env.MONGO_PASS1}@botsubcluster.orij2vq.mongodb.net/?retryWrites=true&w=majority`;
// const uri = 'mongodb+srv://bellokhalid74:AFBLnSegW0YrZ7Rm@botsubcluster.juxjaki.mongodb.net/?retryWrites=true&w=majority';
// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// function createClient() {
//     const client = new MongoClient(uri, {
//         serverApi: {
//             version: ServerApiVersion.v1,
//             strict: true,
//             deprecationErrors: true,
//         },
//     });
//     return client;
// } // end of createClient


// async function migrateSettled() {
//     const client = createClient();
//     let index = 0
//     await client.connect();

//     // migrating settled
//     const settled = client.db('botsubcluster').collection('settled-delivery-prod');

//     const datas = await settled.find({ status: 'settled'}).toArray();
//     console.log(datas)
//     const promises = datas.map(populate)
//     async function populate(data) {
//         const doc = {
//             id: data._id,
//             email: 'migrated@gmail.com',
//             txRef: data.txRef,
//             status: true,
//             product: 'migrated',
//             beneficiary: 'migrated',
//             date: Date()
//         };
//         const response = await transactions.updateOne({ id: data._id },
//             { $set: doc },
//             { upsert: true }
//         );
//         console.log('migrating settled transctions: ', index, response);
//         index++;
//     };
//     await Promise.all(promises);
// };

// async function migrateBotUsers() {
//     const client = createClient();
//     let index = 0
//     await client.connect();

//     // migrating botusers
//     const settled = client.db('botsubcluster').collection('fb-bot-users-prod');

//     const datas = await settled.find({}).toArray();
//     console.log(datas)
//     const promises = datas.map(populate);
//     async function populate(data) {
//         const doc = {
//             id: data.id,
//             email: 'migrated@gmail.com',
//             nextAction: data.nextAction,
//             purchasePayload: data.purchasePayload || {}
//         };
//         const response = await botUsers.updateOne({ id: data.id },
//             { $set: doc },
//             { upsert: true }
//         );
//         console.log('migrating bot users transctions: ', index, response);
//         index++;
//     };
//     await Promise.all(promises);
// };
// connectDB();
// migrateSettled();
// migrateBotUsers()