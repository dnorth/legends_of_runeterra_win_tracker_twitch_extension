import React, { useReducer, useEffect } from 'react'
import socketIOClient from "socket.io-client";

import TrackerData from './TrackerData';

const LOCAL_SERVER = "https://127.0.0.1:6750/";

const initialState = []

const addOrUpdateRecord = (trackerData, recordToUpdate) => {
    const indexIfRecordExistsInTrackerData = trackerData.findIndex(record => record.id === recordToUpdate.id);
    
    return indexIfRecordExistsInTrackerData !== -1 ? Object.assign(trackerData.slice(), { [indexIfRecordExistsInTrackerData]: recordToUpdate }) : [recordToUpdate, ...trackerData]
}

const reducer = (trackerData, action) => {
    const stateMap = {
        'addOrUpdateRecord': addOrUpdateRecord(trackerData, action.recordToUpdate),
    }

    return stateMap[action.type] || trackerData
}

const TrackerDataFetcher = (props) => {
    //TODO: call an AWS lambda that does a DB "get" with the channel Id and active session Id
    // In order to accomplish the above this means we need to be saving channel ids in the DB with the game data (and create a GSI with partition key channel_id - gameStartTimestamp)
    // We also need to create a new table that saves channel ids (maybe to player names?) to active session ids (for win tracker. not necessary for panel tracker if we want to just show last X games or whatever. Probably better to start there first) 

    const [trackerData, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        const twitch = window.Twitch ? window.Twitch.ext : null

        if(twitch) {
            twitch.listen('broadcast',(target,contentType,body)=>{
                const parsedBody = JSON.parse(body);
    
                if(parsedBody.historyUpdated) {
                    const recordToUpdate = parsedBody.historyUpdated.record;
                    dispatch({ type: 'addOrUpdateRecord', recordToUpdate })
                }
            })
        }

        return () => {
            if(twitch) {
                twitch.unlisten('broadcast', ()=>console.log('successfully unlistened'))
            }
        }
    }, []);

    return (
        <>
            {props.children(new TrackerData(trackerData))}
        </>
    )
}

export default TrackerDataFetcher