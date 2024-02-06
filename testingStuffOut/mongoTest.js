import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
config();

async function connectToCluster(uri) {
    let mongoClient;
 
    try {
        mongoClient = new MongoClient(uri);
        console.log('Connecting to MongoDB Atlas cluster...');
        await mongoClient.connect();
        console.log('Successfully connected to MongoDB Atlas!');
 
        return mongoClient;
    } catch (error) {
        throw Error('Connection to MongoDB Atlas failed!', error);
    }
 }

 connectToCluster(process.env.DB_URI).then(async mongoClient=>{
    mongoClient.db("TestDataBase");
    const db = mongoClient.db("TestDataBase");
    const collection = db.collection('TestCollection');

    const testData = {
        name: 'John Smith',
        birthdate: new Date(2000, 11, 20),
        address: { street: 'Pike Lane', city: 'Los Angeles', state: 'CA' },
    };
    const results = await collection.find({ name:"John Smith" }).toArray();
    console.log(results);


    await mongoClient.close();
 }).catch(error=>{
    console.error(error);
 })

