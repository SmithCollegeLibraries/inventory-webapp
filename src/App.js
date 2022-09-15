import React, { Component } from 'react';
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import './css/bootstrap.css'
import './css/index.css'
import 'react-s-alert/dist/s-alert-default.css'
import { 
  Trays, 
  Shelf, 
  TrayManagement, 
  AddPaging, 
  PagingDisplay, 
  Reports, 
  History, 
  Search, 
  CollectionManagement,
  ILL,
  ShelfManagement,
  UserManagement
} from './containers'
import Header from './components/header'
import Alert from 'react-s-alert'
import ContentSearch from './util/search'
import { LoginPage } from './components/login'
import Load from './util/load'
import Alerts from './components/alerts'
import localforage from 'localforage'
import { createBrowserHistory } from 'history';
import { ToastContainer } from 'react-toastify';
import { failure } from './components/toastAlerts'

const history = createBrowserHistory();

export default class Main extends Component {
  
  state = {
    collections: {},
    email: '',
    password: '',
    loggedIn: false,
    createAccount: false,
    type: '',
    name: '',
    settings: {},
  }

  componentDidMount = async () => {
    if(sessionStorage.getItem('account') || this.state.loggedIn === true ) {
      this.collections()
      this.settings()
    }  
  }

  localStorage = async (key) => {
    const results = await localforage.getItem(key)
    return results
  }

  collections = async () => {
    const search = await ContentSearch.collections()
    this.setState({ collections: search })
  }

  settings = async () => {
    let settings = await this.localStorage('settings')
    if(!settings){
      settings = await ContentSearch.setting()
      localforage.setItem('settings', settings)
    }

    this.setState({ settings: settings })
  }

  handleCreateNewPage = () => {
    this.setState({
      createAccount: true
    })
  }

  handleLoginChange = e => {
    this.setState({
      [e.target.name]: e.target.value
    })
  }

  handleLoginSubmit = async e => {
    e.preventDefault()
    const data = {
      email: this.state.email,
      password_field: this.state.password
    }
    const account = await Load.getAccount(data)
    const { first_name, last_name, access_token, type } = account || ''
    if(account && account.access_token){
      this.setState({
        loggedIn: true,
        first_name: first_name,
        last_name: last_name,
        access_key: access_token,
        type: type
      }, () => {
        sessionStorage.setItem('account', JSON.stringify({loggedIn: true, account }))
        this.collections()
        history.push("/sis-webapp/trays")
      })
    } else {
      failure('There was a problem with your username or password')
    }
  }


  loginPage = () => {
    this.setState({
      createAccount: false
    })
  }



  render(){
  const { loggedIn, name, createAccount, settings} = this.state
  return (
    <div>
       <ToastContainer />
       <Router basename="/sis-webapp">
       <Header 
          name={this.state.first_name}
          type={this.state.type}
       />
        {sessionStorage.getItem('account') || loggedIn === true ?
        <div className="container-fluid">
          <Switch>
            <Route exact path="/" render={() => (
               <Trays 
                  collections={this.state.collections}
                  settings={settings}
               /> 
            )}/>
            <Route path="/trays" render={() => (
               <Trays 
                  collections={this.state.collections}
                  settings={settings}
               /> 
            )}/>
            <Route path="/shelf" render={() => (
               <Shelf 
                  collections={this.state.collections}
                  settings={settings}
               /> 
            )}/>
            <Route path="/tray-management" render={() => (
               <TrayManagement
                  collections={this.state.collections}
               /> 
            )}/>
            <Route path="/shelf-management" render={() => (
               <ShelfManagement
                  collections={this.state.collections}
               /> 
            )}/>
            <Route path="/collection-management" render={() => (
               <CollectionManagement
                  collections={this.state.collections}
                  newCollections={this.collections}
               /> 
            )}/>
            <Route path="/paging-add" render={() => (
               <AddPaging
                  settings={settings}
               /> 
            )}/>
            <Route path="/paging-display" render={() => (
               <PagingDisplay
                  settings={settings}
               /> 
            )}/>
            <Route path="/reports" render={() => (
               <Reports
                  settings={settings}
               /> 
            )}/>
            <Route path="/history" render={() => (
               <History
                  settings={settings}
               /> 
            )}/>
           <Route path="/search" render={() => (
               <Search
                  settings={settings}
               /> 
            )}/>
            <Route path="/ill" render={() => (
               <ILL
                  settings={settings}
               /> 
            )}/>
             <Route path="/users" render={() => (
               <UserManagement
                  settings={settings}
               /> 
            )}/>
          </Switch>  
           </div>
              :
              <LoginPage 
                  handleCreateNewPage={this.handleCreateNewPage}
                  handleLoginChange={this.handleLoginChange}
                  handleLoginSubmit={this.handleLoginSubmit}
                  state={this.state}
              /> 
              }
    </Router>
    </div>
  )
  }
}