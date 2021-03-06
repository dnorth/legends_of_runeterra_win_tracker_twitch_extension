const axios = require('axios');

const LoRStatusChecker = require('./StatusChecker');
const TwitchAuth = require('./twitchAuth/TwitchAuth');
const { IS_PROD } = require('./ProdChecker');

const DEFAULT_LOR_PORT = 21337;
const bearerPrefix = "Bearer ";

const getLoRClientAPI = async (path, port) => {
    const lorPort = port || DEFAULT_LOR_PORT;

    try {
        const response = await axios.get(`http://127.0.0.1:${lorPort}/${path}`);
        LoRStatusChecker.setStatus(true);
        return response.data;
    } catch(e) {
        if( e.code === 'ECONNREFUSED') {
            LoRStatusChecker.setStatus(false);

            return { errorMessage: `Cannot detect that Legends of Runeterra is open. Please ensure that you have Third Party Tools enable and that it is set to ${lorPort}.` }
        } else {
            return { errorMessage: e.message, code: e.code }
        } 
    }
}

const addOrUpdateHistoryRecordToDynamoDB = (recordToUpdate) => {
    return IS_PROD ? addOrUpdateHistoryProd(recordToUpdate) : addOrUpdateHistoryLocal(recordToUpdate);
}

const addOrUpdateHistoryLocal = (recordToUpdate) => {
    const { makeBroadcast } = require('./authentication');
    const AWS = require('aws-sdk');
    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.put(recordToUpdate.dynamoDbBasicParams, (err, data) => {
        if (err) {
            makeBroadcast(recordToUpdate.twitchChannelId, JSON.stringify({"historyUpdated": { record: recordToUpdate.toJson(), success: false } }));
            console.log(`failed to add/update record ${JSON.stringify(recordToUpdate.toJson(), null, 4)}! Error: ${err.message}`);
        } else {
            makeBroadcast(recordToUpdate.twitchChannelId, JSON.stringify({"historyUpdated": { record: recordToUpdate.toJson(), success: true } }));
            console.log(`successfully added/updated record ${recordToUpdate.id}!`);
        }
    });
}

const addOrUpdateHistoryProd = async (recordToUpdate) => {
    const authenticatedTwitchUser = TwitchAuth.authenticatedTwitchUser;

    const authorizationHeader = authenticatedTwitchUser.accessToken ? bearerPrefix + authenticatedTwitchUser.accessToken : 'playerName';

    const axiosInstance = axios.create({
        baseURL: 'https://n1lych6sf6.execute-api.us-east-2.amazonaws.com/production/updateHistory',
        headers: {
            'Authorization': authorizationHeader,
            'Content-Type': 'application/json'
        }
    })
    
    try {
        const response = await axiosInstance.post('/', recordToUpdate.dynamoDbBasicParams, { params: { refreshToken: authenticatedTwitchUser.refreshToken }});
        const responseData = response.data;

        if(responseData.newAuthenticatedTwitchUser) {
            TwitchAuth.updateAuthenticatedUser(responseData.newAuthenticatedTwitchUser);
        }
    } catch (e) {
        if (e.response && e.response.invalidateUser) {
            console.log("Couldn't authenticate... removing user.");
            TwitchAuth.removeUserIfExists();
        } else {
            console.log('unknown error: ', (e.response && e.response.data) || e.message)
        }
    }
}

module.exports = {
    getLoRClientAPI,
    addOrUpdateHistoryRecordToDynamoDB
}