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

import { webapp_base } from '../config/endpoints';


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
    window.location.href = webapp_base;
  };

  render() {
    const storage = JSON.parse(sessionStorage.getItem('account'));
    const { account } = storage || '';
    const { level } = account || '';
    return (
      <div>
        <Navbar color="dark" dark expand="md">
          <NavbarBrand href="#!">SIS &rsquo;23 (Version 4.1.3)</NavbarBrand>
          <NavbarToggler onClick={this.toggle} />
          {sessionStorage.getItem('account') ?
            <Collapse isOpen={this.state.isOpen} navbar>
              <Nav className="ml-auto" navbar>
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/new-tray">New tray</NavLink>
                </NavItem>
                {/*
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/shelf">Shelf</NavLink>
                </NavItem>
                <UncontrolledDropdown nav inNavbar>
                  <DropdownToggle nav caret>
                    Paging
                  </DropdownToggle>
                  <DropdownMenu right>
                    <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/paging-add">Add</NavLink>
                    </DropdownItem>
                    <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/paging-display">Pick</NavLink>
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/search">Search</NavLink>
                </NavItem>
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/history">History</NavLink>
                </NavItem>
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/reports">Reports</NavLink>
                </NavItem>
                */}
                <NavItem>
                  <NavLink className="nav-link" activeStyle={{ color: '#007BFF' }} to="/rapid-load">Rapid load</NavLink>
                </NavItem>
                <UncontrolledDropdown nav inNavbar>
                  <DropdownToggle nav caret>
                    Manage
                  </DropdownToggle>
                  <DropdownMenu right>
                    <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-collections">Collections</NavLink>
                    </DropdownItem>
                    <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-trays">Trays</NavLink>
                    </DropdownItem>
                    <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-items">Items</NavLink>
                    </DropdownItem>
                    {/* <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/manage-shelves">Shelf</NavLink>
                    </DropdownItem> */}
                  {level >= 100 ?
                    <DropdownItem>
                      <NavLink style={{color: 'black'}} activeStyle={{ color: '#007BFF' }} className="nav-link" to="/users">Users</NavLink>
                    </DropdownItem>
                    : ''
                  }
                  </DropdownMenu>
                </UncontrolledDropdown>
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
