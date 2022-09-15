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


export const Routes = ({ }) => (
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
    
)