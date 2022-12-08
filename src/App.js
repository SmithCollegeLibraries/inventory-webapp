import React, { Component } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import './css/bootstrap.css';
import './css/index.css';
import 'react-s-alert/dist/s-alert-default.css';
import {
    NewTray,
    // Shelf,
    // AddPaging,
    // PagingDisplay,
    // Reports,
    // History,
    // Search,
    ManageCollections,
    ManageTrays,
    ManageItems,  // delete later
    // ManageShelves,
    ManageUsers
  } from './containers';
import Header from './components/header';
import ContentSearch from './util/search';
import { LoginPage } from './components/login';
import Load from './util/load';
import localforage from 'localforage';
// import { createBrowserHistory } from 'history';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { failure } from './components/toastAlerts'

// const history = createBrowserHistory();

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
  };

  componentDidMount = async () => {
    if (sessionStorage.getItem('account') || this.state.loggedIn === true ) {
      this.collections();
      this.items();  // todo: delete later
      this.trays();  // todo: delete later
      // this.settings();
    }
  };

  localStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  };

  collections = async () => {
    const search = await ContentSearch.collections();
    this.setState({ collections: search });
  };

  items = async () => {
    const search = await Load.viewAllItems();
    this.setState({ items: search });
  };

  trays = async () => {
    const search = await Load.viewAllTrays();
    this.setState({ trays: search });
  };


  // settings = async () => {
  //   let settings = await this.localStorage('settings');
  //   if (!settings) {
  //     settings = await ContentSearch.setting();
  //     localforage.setItem('settings', settings);
  //   }

  //   this.setState({ settings: settings });
  // }

  handleCreateNewPage = () => {
    this.setState({
      createAccount: true
    });
  };

  handleLoginChange = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  handleLoginSubmit = async e => {
    e.preventDefault();
    const data = {
      email: this.state.email,
      password: this.state.password
    };
    const account = await Load.getAccount(data);
    const { name, access_token, level } = account || '';
    if (account && account.access_token) {
      this.setState({
        loggedIn: true,
        name: name,
        access_key: access_token,
        level: level
      }, () => {
        sessionStorage.setItem('account', JSON.stringify({loggedIn: true, account }));
        this.collections();
        this.trays();  // delete later
        this.items();  // delete later
      })
    } else {
      failure('There was a problem logging in.');
    }
  }


  loginPage = () => {
    this.setState({
      createAccount: false
    });
  };

  render() {
    // const { loggedIn, settings} = this.state;
    const { loggedIn } = this.state;
    return (
      <div>
        <ToastContainer />
        <Router basename="/sis">
          <Header
            name={this.state.name}
            level={this.state.level}
          />
          {sessionStorage.getItem('account') || loggedIn === true ?
            <div className="container-fluid">
              <Switch>
                <Route exact path="/">
                  <Redirect to="/new-tray" />
                </Route>
                <Route path="/new-tray" render={() => (
                  <NewTray
                    collections={this.state.collections}
                    // settings={settings}
                  />
                )}/>
                <Route path="/manage-trays" render={() => (
                  <ManageTrays
                    trays={this.state.trays}
                  />
                )}/>
                <Route path="/manage-items" render={() => (
                  <ManageItems
                    items={this.state.items}
                  />
                )}/>
                {/*
                <Route path="/shelf" render={() => (
                  <Shelf
                    collections={this.state.collections}
                    settings={settings}
                  />
                )}/>
                <Route path="/manage-shelves" render={() => (
                  <ManageShelves
                    collections={this.state.collections}
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
                )}/> */}
                <Route path="/manage-collections" render={() => (
                  <ManageCollections
                    collections={this.state.collections}
                    newCollections={this.collections}
                  />
                )}/>
                <Route path="/users" render={() => (
                  <ManageUsers
                    // settings={settings}
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
    );
  }
};
