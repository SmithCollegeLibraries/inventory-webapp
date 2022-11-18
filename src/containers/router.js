import React, { Route, Switch } from 'react'

import {
    Trays,
    Shelf,
    AddPaging,
    PagingDisplay,
    Reports,
    History,
    Search,
    ManageCollections,
    ManageTrays,
    ManageShelves,
    ManageUsers
  } from './containers'


export const Routes = () => (
  <Switch>
    {/* <Route exact path="/" render={() => (
      <Trays
        collections={this.state.collections}
        settings={this.state.settings}
      />
    )}/> */}
    <Route path="/new-tray" render={() => (
      <Trays
        collections={this.state.collections}
        settings={this.state.settings}
      />
    )}/>
    {/* <Route path="/shelf" render={() => (
      <Shelf
        collections={this.state.collections}
        settings={this.state.settings}
      />
    )}/>
    <Route path="/manage-trays" render={() => (
      <ManageTrays
        collections={this.state.collections}
      />
    )}/>
    <Route path="/manage-shelves" render={() => (
      <ManageShelves
        collections={this.state.collections}
      />
    )}/> */}
    <Route path="/manage-collections" render={() => (
      <ManageCollections
        collections={this.state.collections}
        newCollections={this.collections}
      />
    )}/>
    {/* <Route path="/paging-add" render={() => (
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
    )}/> */}
    <Route path="/users" render={() => (
      <ManageUsers
        settings={this.state.settings}
      />
    )}/>
  </Switch>
);
