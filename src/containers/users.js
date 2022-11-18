import React, { useState, useEffect, useReducer } from 'react';
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

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [level, setLevel] = useState(0);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab ] = useState("user_update");

  useEffect(() => {
    getUsers();
  }, []);

  const toggle = tab => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
    getUsers();
  }

  async function getUsers() {
    const search = await Load.getUsers();
    setUsers(search);
  };

  const handleSubmit = async (e, index) => {
    e.preventDefault();
    const data = users[index];
    const update = await Load.accountUpdate(data);
    users[index].password = "";
    setPassword("");
    if (update) {
      success("Account successfully updated");
    } else {
      failure("There was an error updating this account. Please make sure that the level is between 0 and 100.");
    }
  };

  const updateLevel = (e, index) => {
    e.preventDefault();
    users[index].level = e.target.value;
    setLevel(e.target.value);
  };

  const updatePassword = (e, index) => {
    e.preventDefault();
    users[index].password = e.target.value;
    setPassword(e.target.value);
  };

  const handleDelete = (e, index) => {
    e.preventDefault();
    if (window.confirm("Delete this user? This action can only be undone by the database administrator.")) {
      const data = users[index];
      const deleteAccount = Load.accountDelete(data);
      if (deleteAccount) {
          success('Account successfully deleted');
          getUsers();
      } else {
        failure("There was an error deleting this account");
      }
    }
  };

  return (
    <div className="container-fluid" style={{backgroundColor: '#fff', marginTop: "50px", padding: "20px"}}>
      <div style={{paddingBottom: '50px'}}>
        <Nav tabs>
          <NavItem>
            <NavLink
              className={classnames({ active: activeTab === 'user_update' })}
              onClick={() => { toggle('user_update'); }}
            >
            Users
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classnames({ active: activeTab === 'user_creation' })}
              onClick={() => { toggle('user_creation'); }}
            >
            Create new user
            </NavLink>
          </NavItem>
        </Nav>
        <br />
        <TabContent activeTab={activeTab}>
          <TabPane tabId="user_update">
            <UserUpdate
              users={users}
              updatePassword={updatePassword}
              updateLevel={updateLevel}
              handleSubmit={handleSubmit}
              handleDelete={handleDelete}
            />
          </TabPane>
          <TabPane tabId="user_creation">
            <UserCreation />
          </TabPane>
        </TabContent>
      </div>
    </div>
  );
};

const UserUpdate = ({ users, updatePassword, updateLevel, handleSubmit, handleDelete }) => {
  return (
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
        {users && users.length ? Object.keys(users).map((items, index) =>
          <tr key={index}>
            <td>{users[items].name}</td>
            <td>{users[items].email}</td>
            <td><Input type="password" name="password" value={users[items].password} onChange={e => updatePassword(e, index)} /></td>
            <td><Input type="number" name="level" value={users[items].level} min="0" max="100" onChange={e => updateLevel(e, index)} /></td>
            <td>
              <Button color="primary" onClick={(e) => handleSubmit(e, index)} style={{"marginRight": "10px"}}>Update</Button>
              <Button color="danger" onClick={(e) => handleDelete(e, index)}>Delete</Button>
            </td>
          </tr>
        ) : null}
      </tbody>
    </Table>
  );
}

const UserCreation = () => {

  const initialState = {
    createNewAccount : {
      email: '',
      password: '',
      name: '',
      level: '',
    }
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case 'CREATE_ACCOUNT':
        const createNewAccount = state.createNewAccount;
        createNewAccount[action.payload.name] = action.payload.value;
        return {
          ...state,
          createNewAccount,
        };
      case 'RESET':
        return {
          ...state,
          createNewAccount: {
            email: '',
            password: '',
            name: '',
            level: '',
          }
        };
      default:
        throw new Error();
    }
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleCreationChange = e => {
    dispatch({
      type: 'CREATE_ACCOUNT',
      payload: {
        name: e.target.name,
        value: e.target.value,
      }});
  };

  const handleAccountCreationSubmit = async (e) => {
    e.preventDefault();
    const data = {
      email: state.createNewAccount.email,
    };
    const account = await Load.verifyAccount(data);
    if (account) {
      failure("An account with this email address already exists. If it does not appear in the list, it may have been deleted. Contact the system administrator to restore a deleted account if necessary.");
    } else {
      const create = await Load.createAccount(state.createNewAccount);
      if (create) {
        dispatch({
          type: 'RESET',
          payload: {}
        });
        success('Account successfully created');
      } else {
        failure("There was a problem creating this account");
      }
    }
  };

  return (
    <div>
      <Form className="form-signin">
        <FormGroup>
          <Label for="email">Email address</Label>
          <Input type="email" value={state.createNewAccount.email} pattern="/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/" name="email" onChange={(e) => handleCreationChange(e)} required autoFocus />
        </FormGroup>
        <FormGroup>
          <Label for="password">Password</Label>
          <Input type="password" name="password" value={state.createNewAccount.password} onChange={(e) => handleCreationChange(e)} required />
        </FormGroup>
        <FormGroup>
          <Label for="name">Name</Label>
          <Input type="text" name="name" value={state.createNewAccount.name} onChange={(e) => handleCreationChange(e)} required />
        </FormGroup>
        <FormGroup>
          <Label for="level">Level</Label>
          <Input type="number" name="level" min="0" max="100" value={state.createNewAccount.level} onChange={e => handleCreationChange(e)} required />
        </FormGroup>
        <Button color="primary" className="btn-block" onClick={(e) => handleAccountCreationSubmit(e)} type="submit">Create account</Button>
      </Form>
    </div>
  );
}

export default ManageUsers;
