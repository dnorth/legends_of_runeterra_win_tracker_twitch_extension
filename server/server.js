const express = require('express');
const cors = require('cors');
const jsonwebtoken = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const { IS_PROD } = require('./ProdChecker');

//DynamoDb Config
const dynamoDBRoutes = require('./dynamodb/routes');
const dynamoDBConfig = require('./dynamodb/config/config');
AWS.config.update(IS_PROD ? dynamoDBConfig.aws_remote_config : dynamoDBConfig.aws_local_config);

//Twitch Auth Config
const twitchAuthRoutes = require('./twitchAuth/routes')

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

app.get('/', (req, res) => {
    res.send('Alive and well!');
})

app.use('/db', dynamoDBRoutes);
app.use('/twitchAuth', twitchAuthRoutes);

const port = process.env.PORT || 6750;

app.listen(port, () => console.log('App is listening on port ', port))

const LoRHistoryTracker = require('./LoRHistoryTracker');

const lorHistoryTracker = new LoRHistoryTracker();

lorHistoryTracker.startTrackingHistory(1000);

