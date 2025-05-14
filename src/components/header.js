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
import { NavLink, withRouter } from 'react-router-dom';
import { firstName } from '../util/helpers';


class Header extends Component {
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
    const { location } = this.props;
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
                { level >= 30 &&
                  <UncontrolledDropdown nav inNavbar className={/\/new-/.test(location.pathname) ? "active-child" : ""}>
                    <DropdownToggle nav caret>
                      New
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/new-tray">New tray</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/new-box">New box</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                { level >= 30 &&
                  <NavItem>
                    <NavLink className="nav-link" to="/rapid-shelve">Shelve</NavLink>
                  </NavItem>
                }
                { level >= 40 &&
                  <NavItem>
                    <NavLink className="nav-link" to="/picklist">Pick</NavLink>
                  </NavItem>
                }
                { level >= 40 &&
                  <NavItem>
                    <NavLink className="nav-link" to="/add-return">Add/Return</NavLink>
                  </NavItem>
                }
                { level >= 20 &&
                  <UncontrolledDropdown nav inNavbar className={/\/search-/.test(window.location.pathname) ? "active-child" : ""}>
                    <DropdownToggle nav caret>
                      Search
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/search-items">Items</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/search-shelves">Shelves/Trays</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                { level >= 35 &&
                  <UncontrolledDropdown nav inNavbar className={/\/manage-/.test(window.location.pathname) ? "active-child" : ""}>
                    <DropdownToggle nav caret>
                      Manage
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/manage-items">Items</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/manage-trays">Trays</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/manage-collections">Collections</NavLink>
                      </DropdownItem>
                      {level >= 100 &&
                          <DropdownItem>
                            <NavLink className="nav-link" to="/users">Users</NavLink>
                          </DropdownItem>
                      }
                      <DropdownItem>
                        <NavLink className="nav-link" to="/settings">Settings</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                { level >= 40 &&
                  <UncontrolledDropdown nav inNavbar className={/\/logs\//.test(window.location.pathname) ? "active-child" : ""}>
                    <DropdownToggle nav caret className='admin-level'>
                      Logs
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/logs/items">Item logs</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/logs/trays">Tray logs</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/logs/shelves">Shelf logs</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/logs/collections">Collection logs</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                { level >= 40 &&
                  <UncontrolledDropdown nav inNavbar className={/\/reports\//.test(window.location.pathname) ? "active-child" : ""}>
                    <DropdownToggle nav caret className='admin-level'>
                      Reports
                    </DropdownToggle>
                    <DropdownMenu right>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/reports/counts">Counts</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/reports/space-usage">Space usage</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/reports/fill-rate">Fill rate</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/reports/request-history">Request history</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink className="nav-link" to="/reports/circ-counts">Circ counts</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                }
                <NavItem>
                  <NavLink className="nav-link auth-level" to="#!" onClick={(e) => this.logOut(e)}>
                    Log out
                  </NavLink>
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

export default withRouter(Header);
