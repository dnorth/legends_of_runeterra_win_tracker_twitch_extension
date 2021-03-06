import React from 'react'
import Authentication from '../../util/Authentication/Authentication'
import TrackerDataFetcher from '../TrackerDataFetcher'
import requestingClientTypes from '../requesting-client.types';
import ErrorBoundary from '../ErrorBoundary';

import PanelRouter from './Router'

import '../../fonts/Beaufort for LOL Bold.ttf'
import classNames from 'classnames'

import './PanelApp.css'

export default class App extends React.Component{
    constructor(props){
        super(props)
        this.Authentication = new Authentication()

        //if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null. 
        this.twitch = window.Twitch ? window.Twitch.ext : null
        this.state={
            finishedLoading:false,
            theme:'light',
            isVisible:true
        }
    }

    contextUpdate(context, delta){
        if(delta.includes('theme')){
            this.setState(()=>{
                return {theme:context.theme}
            })
        }
    }

    visibilityChanged(isVisible){
        this.setState(()=>{
            return {
                isVisible
            }
        })
    }

    componentDidMount(){
        if(this.twitch){
            this.twitch.onAuthorized((auth)=>{
                this.Authentication.setToken(auth.token, auth.userId)
                if(!this.state.finishedLoading){
                    this.setState(()=>{
                        return {finishedLoading:true}
                    })
                }
            })

            this.twitch.onVisibilityChanged((isVisible,_c)=>{
                this.visibilityChanged(isVisible)
            })

            this.twitch.onContext((context,delta)=>{
                this.contextUpdate(context,delta)
            })
        }
    }
    
    render(){
        const { finishedLoading, isVisible, theme } = this.state

        if(finishedLoading && isVisible){
            return (
                <ErrorBoundary>
                    <TrackerDataFetcher authentication={this.Authentication} requestingClient={requestingClientTypes.HISTORY_TRACKER_PANEL}>
                    {({ trackerData, isLoaded }) => isLoaded
                        ? <PanelRouter trackerData={trackerData} className={classNames({'light-theme': theme === 'light'}, {'dark-theme': theme === 'dark'})} />
                        : <div></div>
                    }
                    </TrackerDataFetcher>
                </ErrorBoundary>
            )
        } else {
            return (
                <div className="App">
                </div>
            )
        }
    }
}