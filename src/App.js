import React, { Component } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import './css/bootstrap.css';
import './css/index.css';
import 'react-s-alert/dist/s-alert-default.css';
import {
    NewTray,
    RapidShelve,
    AddReturn,
    ItemSearch,
    ManageCollections,
    ManageTrays,
    ManageItems,
    Picklist,
    ManageUsers,
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
      this.getCollections();
      // this.settings();
    }
  };

  localStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  };

  getCollections = async () => {
    const results = await ContentSearch.collections();
    this.setState({ collections: results });
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
    const { id, name, access_token, level } = account || '';
    if (account && account.access_token) {
      this.setState({
        loggedIn: true,
        id: id,
        name: name,
        access_key: access_token,
        level: level
      }, () => {
        sessionStorage.setItem('account', JSON.stringify({loggedIn: true, account }));
        this.getCollections();
      })
    }
    else {
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
        <Router basename={process.env.REACT_APP_ROOT}>
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
                  <NewTray />
                )}/>
                <Route path="/rapid-shelve" render={() => (
                  <RapidShelve />
                )}/>
                <Route path="/return" render={() => (
                  <AddReturn />
                )}/>
                <Route path="/item-search" render={() => (
                  <ItemSearch />
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
                <Route path="/picklist" render={() => (
                  <Picklist />
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
