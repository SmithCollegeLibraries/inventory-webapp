import React, { Component } from 'react';
import {
    Collapse,
    Navbar,
    NavbarToggler,
    NavbarBrand,
    Nav,
    NavItem,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
  } from 'reactstrap';
import { NavLink } from 'react-router-dom';
import { firstName } from '../util/helpers';


export default class Header extends Component {
  state = {
    isOpen: false
  };

  toggle = () => {
    this.setState({
      isOpen: !this.state.isOpen
    })
  };

  logOut = (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = process.env.PUBLIC_URL;
  };

  render() {
    const storage = JSON.parse(sessionStorage.getItem('account'));
    const { account } = storage || '';
    const { level } = account || '';
    const isTestInstance = process.env.REACT_APP_ROOT.includes("-dev");
    const isBetaInstance = process.env.REACT_APP_ROOT.includes("-beta");
    const versionSuffix = isTestInstance ? "— TEST SITE: YOUR WORK WILL NOT BE SAVED" : (isBetaInstance ? "BETA" : "");
    const colorAttributes = {
        color: isTestInstance ? 'danger' : (isBetaInstance ? 'light' : 'dark'),
        light: isTestInstance,
        dark: !isTestInstance,
      };
    const sisHeader = `SIS ${process.env.REACT_APP_VERSION} ${versionSuffix} • ${account ? firstName(account.name) + "’s account" : "Not logged in"}`;
    return (
      <div>
        <Navbar {...colorAttributes} expand="md">
          <NavbarBrand href="#!">{sisHeader}</NavbarBrand>
          <NavbarToggler onClick={this.toggle} />
          {sessionStorage.getItem('account') ?
            <Collapse isOpen={this.state.isOpen} navbar>
              <Nav className="ml-auto" navbar>
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/new-tray">New tray</NavLink>
                </NavItem>
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/rapid-shelve">Shelve</NavLink>
                </NavItem>
                { level >= 40 &&
                  <NavItem>
                    <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/picklist">Pick</NavLink>
                  </NavItem>
                }
                { level >= 40 &&
                  <NavItem>
                    <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/return">Return</NavLink>
                  </NavItem>
                }
                { level >= 35 &&
                  <NavItem>
                    <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/item-search">Search</NavLink>
                  </NavItem>
                }
                { level >= 35 &&
                  <UncontrolledDropdown nav inNavbar>
                    <DropdownToggle nav caret>
                      Manage
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-items">Items</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-trays">Trays</NavLink>
                      </DropdownItem>
                      {/* <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-shelves">Shelves</NavLink>
                      </DropdownItem> */}
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-collections">Collections</NavLink>
                      </DropdownItem>
                      {level >= 100 &&
                          <DropdownItem>
                            <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/users">Users</NavLink>
                          </DropdownItem>
                      }
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/settings">Settings</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                { level >= 60 &&
                  <UncontrolledDropdown nav inNavbar>
                    <DropdownToggle nav caret>
                      Logs
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/item-logs">Item logs</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/tray-logs">Tray logs</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/shelf-logs">Shelf logs</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/collection-logs">Collection logs</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="#!" onClick={(e) => this.logOut(e)}>Log out</NavLink>
                </NavItem>
              </Nav>
            </Collapse>
          : ''
        }
        </Navbar>
      </div>
    );
  }
}
