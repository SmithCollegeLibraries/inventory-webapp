import React, { useEffect } from 'react';
import { Button,
    Form,
    FormGroup,
    Input,
    Label,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Table,
  } from 'reactstrap';
import Load from '../util/load';
import { success, failure } from '../components/toastAlerts';
import classnames from 'classnames';
import { create } from 'zustand';

const manageUsers = create((set) => {
  return {
    activeTab: "update",
    users: [],
    newUser: {
      email: '',
      password: '',
      name: '',
      level: '',
    },

    setActiveTab: (activeTab) => set({ activeTab }),
    loadUsers: async () => { set( { users: await Load.getUsers()} ) },
    updateUserLevel: (index, level) => set((state) => ({
      ...state,
      users: [ ...state.users.slice(0, index),
               { ...state.users[index],
                level: level
               },
               ...state.users.slice(index + 1, state.users.length)
             ],
    })),
    updateUserPassword: (index, password) => set((state) => ({
      ...state,
      users: [ ...state.users.slice(0, index),
               { ...state.users[index],
                 password: password
               },
               ...state.users.slice(index + 1, state.users.length)
             ],
    })),
    setNewUser: (newUser) => set({ newUser }),
    resetNewUser: () => set({
      newUser: {
        email: '',
        password: '',
        name: '',
        level: '',
      }
    }),
  };
});

function Users() {
  const state = manageUsers();

  useEffect(() => {
    state.loadUsers();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e, index) => {
    e.preventDefault();
    const data = state.users[index];
    const update = await Load.accountUpdate(data);
    state.users[index].password = "";
    state.updateUserPassword(index, "");
    if (update) {
      success("Account successfully updated");
    } else {
      failure("There was an error updating this account.");
    }
  };

  const updateLevel = (e, index) => {
    e.preventDefault();
    state.updateUserLevel(index, e.target.value);
  };

  const updatePassword = (e, index) => {
    e.preventDefault();
    state.updateUserPassword(index, e.target.value);
  };

  const handleDelete = (e, index) => {
    e.preventDefault();
    if (window.confirm("Delete this user? This action can only be undone by the database administrator.")) {
      const data = state.users[index];
      const deleteAccount = Load.accountDelete(data);
      if (deleteAccount) {
          success('Account successfully deleted');
          state.loadUsers();
      } else {
        failure("There was an error deleting this account");
      }
    }
  };

  const handleCreationChange = (e) => {
    let nameOfField = e.target.name.replace('new-user-', '');
    state.setNewUser({
      ...state.newUser,
      [nameOfField]: e.target.value,
    });
  };

  const handleAccountCreationSubmit = async (e) => {
    e.preventDefault();
    const data = {
      email: state.newUser.email,
    };
    const accountExists = await Load.verifyAccount(data);
    if (accountExists) {
      failure("An account with this email address already exists. If it does not appear in the list, it may have been deleted. Contact the system administrator to restore a deleted account if necessary.");
    } else {
      const create = await Load.createAccount(state.newUser);
      if (create) {
        state.resetNewUser();
        state.loadUsers();
        success('Account successfully created');
      }
      else {
        failure("There was a problem creating this account");
      }
    }
  };

  return (
    <div className="container-fluid" style={{backgroundColor: '#fff', marginTop: "50px", padding: "20px"}}>
      <div style={{paddingBottom: '50px'}}>
        <Nav tabs>
          <NavItem>
            <NavLink
                className={classnames({ active: state.activeTab === 'update' })}
                onClick={() => { state.setActiveTab('update'); }}
                style={{cursor:'pointer'}}
              >
            Update users
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
                className={classnames({ active: state.activeTab === 'create' })}
                onClick={() => { state.setActiveTab('create'); }}
                style={{cursor: 'pointer'}}
              >
              Create new user
            </NavLink>
          </NavItem>
        </Nav>
        <br />
        <TabContent activeTab={state.activeTab}>
          <TabPane tabId="update">
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Password</th>
                  <th>Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.users && state.users.length ? Object.keys(state.users).map((items, index) =>
                  <tr key={index}>
                    <td>{state.users[items].name}</td>
                    <td>{state.users[items].email}</td>
                    <td><Input type="password" name="password" value={state.users[items].password} onChange={e => updatePassword(e, index)} /></td>
                    <td><Input type="number" name="level" value={state.users[items].level} min="0" max="100" onChange={e => updateLevel(e, index)} /></td>
                    <td>
                      <Button color="primary" onClick={(e) => handleSubmit(e, index)} style={{"marginRight": "10px"}}>Update</Button>
                      <Button color="danger" onClick={(e) => handleDelete(e, index)}>Delete</Button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </TabPane>
          <TabPane tabId="create">
            <div>
              <Form className="form-signin" autoComplete="off">
                <FormGroup>
                  <Label for="name">Name</Label>
                  <Input
                      type="text"
                      name="new-user-name"
                      value={state.newUser.name}
                      onChange={(e) => handleCreationChange(e)}
                      required
                    />
                </FormGroup>
                <FormGroup>
                  <Label for="email">Email address</Label>
                  <Input
                      type="email"
                      value={state.newUser.email}
                      name="new-user-email"
                      onChange={(e) => handleCreationChange(e)}
                      required
                      autoFocus
                      autoComplete="new-user-email"
                      // onFocus={e => { if (e.target.autocomplete) { e.target.autocomplete = "no-auto-email"; }}}
                    />
                </FormGroup>
                <FormGroup>
                  <Label for="password">Password</Label>
                  <Input
                      type="password"
                      name="new-user-password"
                      value={state.newUser.password}
                      onChange={(e) => handleCreationChange(e)}
                      required
                    />
                </FormGroup>
                <FormGroup>
                  <Label for="level">Level</Label>
                  <Input
                      type="number"
                      name="new-user-level"
                      min="0"
                      max="100"
                      value={state.newUser.level}
                      onChange={e => handleCreationChange(e)}
                      required
                    />
                </FormGroup>
                <Button
                    color="primary"
                    className="btn-block"
                    onClick={(e) => handleAccountCreationSubmit(e)}
                    type="submit"
                  >
                  Create account
                </Button>
              </Form>
            </div>
          </TabPane>
        </TabContent>
      </div>
    </div>
  );
};

export default Users;
