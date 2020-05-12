'use strict';
const jwt = require("jsonwebtoken");
const AWS = require('aws-sdk');

const bearerPrefix = "Bearer ";
const serverTokenDurationSec = 30;

const IS_PROD = process.env.NODE_ENV && process.env.NODE_ENV.trim() === 'production';

const winTrackerSecret = IS_PROD ? process.env.WIN_TRACKER_SECRET : require("../../secrets").winTrackerSecret;
const dynamoDBConfig = IS_PROD ? { accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID, secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY, region: 'us-east-2' } : require('../../dynamodb/config/config').aws_local_config;

var secret = Buffer.from(winTrackerSecret, 'base64');

const verifyAndDecode = (header) => {
    if (header && header.startsWith(bearerPrefix)) {
        try {
            const token = header.substring(bearerPrefix.length);
            return jwt.verify(token, secret, { algorithms: ["HS256"] });
        } catch (e) {
          return null;
        }
    }

    return null;
}

const getFormattedResponse = (statusCode, message) => (
  {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin" : "*"
    },
    body: JSON.stringify(message, null, 4)
  }
)

module.exports.getLoRHistoryByChannelId = async event => {
  const decodedJwt = verifyAndDecode(event.headers && event.headers.Authorization);

  if (decodedJwt) {
    const channelId = decodedJwt.channel_id;

    const docClient = new AWS.DynamoDB.DocumentClient(dynamoDBConfig);

    const maybeQueryFrom = event.queryStringParameters && event.queryStringParameters.from;
    const maybeQueryTo = event.queryStringParameters && event.queryStringParameters.to;

    const from = maybeQueryFrom || new Date().toISOString();

    const MAX_DAYS_TO_QUERY = 30;

    const maxDaysAgo = new Date(new Date().setDate(new Date().getDate() - MAX_DAYS_TO_QUERY)).toISOString(); //haha, lovely.
    const maybeTo = maybeQueryTo || maxDaysAgo;

    const to = maybeTo < maxDaysAgo ? maxDaysAgo : maybeTo; //Limit to last MAX_DAYS_TO_QUERY days.
    
    const params = {
        TableName: 'LoRHistory',
        KeyConditionExpression: 'twitchChannelId = :twitchChannelId AND gameStartTimestamp BETWEEN :to AND :from',
        ScanIndexForward: false,
        ExpressionAttributeValues: {
            ":twitchChannelId": channelId,
            ":from": from,
            ":to": to
        },
        Limit: 50,
    };

    try {
      const response = await docClient.query(params).promise();

      return getFormattedResponse(200, {
        data: response.Items
      })

    } catch(error) {
      return getFormattedResponse(500, {
          errorMessage: error.message,
          message: 'Could not get items...',
          data: []
        })
    }
  } else {
    return getFormattedResponse(401, {
      message: 'Valid JWT required.'
    })
  }
};
