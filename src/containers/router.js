import React, { Route, Switch } from 'react'

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
    ShelfManagement,
    UserManagement
  } from './containers'


export const Routes = () => (
  <Switch>
    <Route exact path="/" render={() => (
      <Trays
        collections={this.state.collections}
        settings={this.state.settings}
      />
    )}/>
    <Route path="/trays" render={() => (
      <Trays
        collections={this.state.collections}
        settings={this.state.settings}
      />
    )}/>
    <Route path="/shelf" render={() => (
      <Shelf
        collections={this.state.collections}
        settings={this.state.settings}
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
        settings={this.state.settings}
      />
    )}/>
    <Route path="/paging-display" render={() => (
      <PagingDisplay
        settings={this.state.settings}
      />
    )}/>
    <Route path="/reports" render={() => (
      <Reports
        settings={this.state.settings}
      />
    )}/>
    <Route path="/history" render={() => (
      <History
        settings={this.state.settings}
      />
    )}/>
    <Route path="/search" render={() => (
      <Search
        settings={this.state.settings}
      />
    )}/>
    <Route path="/users" render={() => (
      <UserManagement
        settings={this.state.settings}
      />
    )}/>
  </Switch>
);
